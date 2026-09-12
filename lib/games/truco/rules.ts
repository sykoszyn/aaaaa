import { createSeededRandom, shuffle } from "@/lib/games/core/rng";
import type { GameMove, GameSetupContext, MatchResult, MoveValidation, SeatResult } from "@/lib/games/core/types";
import { buildDeck, cardPower } from "./deck";
import { calculateEnvido, envidoAcceptPoints, envidoDeclineValue } from "./envido";
import type {
  EnvidoBidState,
  EnvidoLevel,
  FlorState,
  HandEndReason,
  HandSummary,
  TrucoBetLevel,
  TrucoBetState,
  TrucoCard,
  TrucoMovePayload,
  TrucoPlayerView,
  TrucoState,
  TrucoTeam,
} from "./types";

// ============================================================================
// Simplificaciones deliberadas (documentadas, como en lib/games/uno/rules.ts):
//
// 1. Envido y truco nunca están pendientes al mismo tiempo: mientras uno
//    espera respuesta, no se puede abrir el otro. En la mesa real el envido
//    puede "interrumpir" un truco ya cantado; acá el envido simplemente
//    bloquea cualquier truco nuevo hasta resolverse, lo cual da el mismo
//    resultado práctico (el envido siempre se resuelve primero) sin modelar
//    un stack de cantos anidados.
// 2. El envido (y la flor) solo se puede cantar durante la primera baza,
//    hasta que el último jugador la juega — no hay reglas especiales de
//    "segunda carta" para las mesas de 4.
// 3. No hay "contraflor": si más de un asiento canta flor, se compara el
//    puntaje de florEnvido de cada uno (calculateEnvido ya da ese número
//    para 3 cartas del mismo palo) y el equipo con el mayor se lleva los 3
//    puntos — sin escalada adicional.
// 4. Con la respuesta a un canto pendiente ("¿quién responde?"), cualquier
//    integrante del equipo que recibe puede mandar `respond_bid` — pero
//    para que el motor sepa a quién pedirle el movimiento cuando le toca a
//    un bot, `getActiveSeat` siempre apunta al asiento más bajo de ese
//    equipo (ver esa función).
// ============================================================================

function teamOf(seat: number, playerCount: number): TrucoTeam {
  return playerCount === 2 ? (seat as TrucoTeam) : ((seat % 2) as TrucoTeam);
}

function trucoLevelValue(level: TrucoBetLevel | null): number {
  switch (level) {
    case null: return 1;
    case "truco": return 2;
    case "retruco": return 3;
    case "vale_cuatro": return 4;
  }
}

function allowedTrucoRaise(level: TrucoBetLevel | null): TrucoBetLevel | null {
  if (level === null) return "truco";
  if (level === "truco") return "retruco";
  if (level === "retruco") return "vale_cuatro";
  return null;
}

function allowedEnvidoRaises(calls: EnvidoLevel[]): EnvidoLevel[] {
  if (calls.includes("real_envido") || calls.includes("falta_envido")) return ["falta_envido"];
  const envidoCount = calls.filter((c) => c === "envido").length;
  if (envidoCount >= 2) return ["real_envido", "falta_envido"];
  return ["envido", "real_envido", "falta_envido"];
}

function hasFlor(hand: TrucoCard[]): boolean {
  return hand.length > 0 && hand.every((c) => c.suit === hand[0].suit);
}

function emptyEnvido(): EnvidoBidState {
  return { calls: [], pending: null, resolved: false, winnerTeam: null, pointsAwarded: 0 };
}

function emptyTruco(): TrucoBetState {
  return { level: null, calledByTeam: null, pending: null };
}

function emptyFlor(): FlorState {
  return { declaredSeats: [], resolved: false, winnerTeam: null, pointsAwarded: 0 };
}

function dealNewHand(prev: TrucoState): TrucoState {
  const dealerSeat = (prev.dealerSeat + 1) % prev.playerCount;
  const manoSeat = (dealerSeat + 1) % prev.playerCount;
  const rngCounter = prev.rngCounter + 1;
  const rng = createSeededRandom(`${prev.seed}:${rngCounter}`);
  const deck = shuffle(buildDeck(), rng);

  const hands: TrucoCard[][] = Array.from({ length: prev.playerCount }, () => []);
  for (let i = 0; i < 3; i++) {
    for (let s = 0; s < prev.playerCount; s++) {
      hands[s].push(deck.pop()!);
    }
  }

  return {
    ...prev,
    rngCounter,
    dealerSeat,
    manoSeat,
    hands,
    playedThisTrick: Array(prev.playerCount).fill(null),
    trickNumber: 0,
    trickWinners: [],
    currentSeat: manoSeat,
    envido: emptyEnvido(),
    truco: emptyTruco(),
    flor: emptyFlor(),
    handNumber: prev.handNumber + 1,
    // lastHandSummary NO se resetea acá a propósito: describe la mano que
    // recién terminó (la puso endHand() antes de llamar a dealNewHand) y
    // el cliente la sigue mostrando mientras se reparte la próxima.
  };
}

export function createInitialState(ctx: GameSetupContext): TrucoState {
  const playerCount = ctx.players.length;
  if (playerCount !== 2 && playerCount !== 4) {
    throw new Error("El Truco Argentino se juega 1v1 o 2v2 (2 o 4 jugadores)");
  }
  const targetScore = ctx.settings.targetScore === 15 ? 15 : 30;
  const florEnabled = ctx.settings.florEnabled === true;

  const base: TrucoState = {
    playerCount,
    seed: ctx.seed,
    rngCounter: 0,
    targetScore,
    florEnabled,
    matchScore: [0, 0],
    finished: false,
    winnerTeam: null,
    handNumber: 0,
    dealerSeat: playerCount - 1,
    manoSeat: 0,
    hands: [],
    playedThisTrick: [],
    trickNumber: 0,
    trickWinners: [],
    currentSeat: 0,
    envido: emptyEnvido(),
    truco: emptyTruco(),
    flor: emptyFlor(),
    lastHandSummary: null,
  };

  return dealNewHand(base);
}

// ----------------------------------------------------------------------------
// Validación
// ----------------------------------------------------------------------------

export function validateMove(state: TrucoState, move: GameMove<TrucoMovePayload>): MoveValidation {
  if (state.finished) return { valid: false, reason: "La partida ya terminó" };

  const payload = move.payload;
  const seat = move.seat;
  const team = teamOf(seat, state.playerCount);

  if (payload.type === "go_to_deck") {
    return { valid: true };
  }

  if (payload.type === "declare_flor") {
    if (!state.florEnabled) return { valid: false, reason: "La flor no está habilitada en esta sala" };
    if (state.trickNumber !== 0) return { valid: false, reason: "Ya no se puede cantar flor en esta mano" };
    if (state.flor.declaredSeats.includes(seat)) return { valid: false, reason: "Ya declaraste tu flor" };
    if (!hasFlor(state.hands[seat])) return { valid: false, reason: "No tenés flor" };
    return { valid: true };
  }

  if (payload.type === "respond_bid") {
    if (state.envido.pending) {
      if (team === state.envido.pending.calledByTeam) return { valid: false, reason: "Estás esperando la respuesta del rival" };
      return { valid: true };
    }
    if (state.truco.pending) {
      if (team === state.truco.pending.calledByTeam) return { valid: false, reason: "Estás esperando la respuesta del rival" };
      return { valid: true };
    }
    return { valid: false, reason: "No hay ningún canto pendiente" };
  }

  if (payload.type === "call_envido") {
    if (state.trickNumber !== 0) return { valid: false, reason: "Ya no se puede cantar envido en esta mano" };
    if (state.flor.declaredSeats.length > 0) return { valid: false, reason: "Hay flor cantada, no se puede cantar envido" };
    if (state.truco.pending) return { valid: false, reason: "Hay un truco pendiente de respuesta" };

    if (state.envido.pending) {
      if (team === state.envido.pending.calledByTeam) return { valid: false, reason: "No podés subir tu propio canto" };
      const allowed = allowedEnvidoRaises(state.envido.calls);
      if (!allowed.includes(payload.level)) return { valid: false, reason: "Ese canto no es válido ahora" };
      return { valid: true };
    }

    if (state.envido.resolved) return { valid: false, reason: "El envido ya se resolvió en esta mano" };
    if (seat !== state.currentSeat) return { valid: false, reason: "No es tu turno" };
    const allowed = allowedEnvidoRaises(state.envido.calls);
    if (!allowed.includes(payload.level)) return { valid: false, reason: "Ese canto no es válido ahora" };
    return { valid: true };
  }

  if (payload.type === "call_truco") {
    if (state.envido.pending) return { valid: false, reason: "Hay un envido pendiente de respuesta" };

    if (state.truco.pending) {
      if (team === state.truco.pending.calledByTeam) return { valid: false, reason: "No podés subir tu propio canto" };
      if (allowedTrucoRaise(state.truco.pending.level) !== payload.level) {
        return { valid: false, reason: "Ese canto no es válido ahora" };
      }
      return { valid: true };
    }

    if (seat !== state.currentSeat) return { valid: false, reason: "No es tu turno" };
    if (state.truco.calledByTeam === team) {
      return { valid: false, reason: "Ya cantaste, esperá a que el rival responda" };
    }
    if (allowedTrucoRaise(state.truco.level) !== payload.level) {
      return { valid: false, reason: "Ese canto no es válido ahora" };
    }
    return { valid: true };
  }

  if (payload.type === "play_card") {
    if (state.envido.pending || state.truco.pending) return { valid: false, reason: "Hay un canto pendiente de respuesta" };
    if (seat !== state.currentSeat) return { valid: false, reason: "No es tu turno" };
    if (!state.hands[seat].some((c) => c.id === payload.cardId)) return { valid: false, reason: "No tenés esa carta" };
    return { valid: true };
  }

  return { valid: false, reason: "Movimiento desconocido" };
}

// ----------------------------------------------------------------------------
// Aplicación
// ----------------------------------------------------------------------------

export function applyMove(state: TrucoState, move: GameMove<TrucoMovePayload>): TrucoState {
  const payload = move.payload;
  const seat = move.seat;
  const team = teamOf(seat, state.playerCount);

  const next: TrucoState = {
    ...state,
    hands: state.hands.map((h) => [...h]),
    playedThisTrick: [...state.playedThisTrick],
    trickWinners: [...state.trickWinners],
    matchScore: [...state.matchScore] as [number, number],
  };

  switch (payload.type) {
    case "go_to_deck":
      return resolveFold(next, team);
    case "declare_flor":
      next.flor = { ...next.flor, declaredSeats: [...next.flor.declaredSeats, seat] };
      return next;
    case "call_envido":
      next.envido = { ...next.envido, pending: { level: payload.level, calledByTeam: team } };
      return next;
    case "call_truco":
      next.truco = { ...next.truco, pending: { level: payload.level, calledByTeam: team } };
      return next;
    case "respond_bid":
      return applyRespondBid(next, team, payload.accept);
    case "play_card":
      return applyPlayCard(next, seat, payload.cardId);
  }
}

function finishIfNeeded(state: TrucoState): TrucoState {
  const [a, b] = state.matchScore;
  if (a < state.targetScore && b < state.targetScore) return state;
  const winnerTeam: TrucoTeam = a === b ? 0 : a > b ? 0 : 1;
  return { ...state, finished: true, winnerTeam };
}

function compareEnvido(state: TrucoState): TrucoTeam {
  const teamScore: [number, number] = [-1, -1];
  for (let s = 0; s < state.playerCount; s++) {
    const t = teamOf(s, state.playerCount);
    const score = calculateEnvido(state.hands[s]);
    if (score > teamScore[t]) teamScore[t] = score;
  }
  if (teamScore[0] === teamScore[1]) return teamOf(state.manoSeat, state.playerCount);
  return teamScore[0] > teamScore[1] ? 0 : 1;
}

function applyRespondBid(state: TrucoState, respondingTeam: TrucoTeam, accept: boolean): TrucoState {
  if (state.envido.pending) {
    const { level, calledByTeam } = state.envido.pending;
    const calls = [...state.envido.calls, level];

    if (!accept) {
      const points = envidoDeclineValue(calls);
      const matchScore = [...state.matchScore] as [number, number];
      matchScore[calledByTeam] += points;
      return finishIfNeeded({
        ...state,
        matchScore,
        envido: { calls, pending: null, resolved: true, winnerTeam: calledByTeam, pointsAwarded: points },
      });
    }

    const winnerTeam = compareEnvido(state);
    const points = envidoAcceptPoints(calls, state.matchScore[winnerTeam], state.targetScore);
    const matchScore = [...state.matchScore] as [number, number];
    matchScore[winnerTeam] += points;
    return finishIfNeeded({
      ...state,
      matchScore,
      envido: { calls, pending: null, resolved: true, winnerTeam, pointsAwarded: points },
    });
  }

  if (state.truco.pending) {
    const { level, calledByTeam } = state.truco.pending;

    if (!accept) {
      const points = trucoLevelValue(state.truco.level);
      return endHand({ ...state, truco: { ...state.truco, pending: null } }, calledByTeam, points, "no_quiero");
    }

    return { ...state, truco: { level, calledByTeam, pending: null } };
  }

  return state;
}

function resolveFold(state: TrucoState, foldingTeam: TrucoTeam): TrucoState {
  const winnerTeam: TrucoTeam = foldingTeam === 0 ? 1 : 0;
  return endHand(state, winnerTeam, trucoLevelValue(state.truco.level), "fold");
}

function endHand(state: TrucoState, winnerTeam: TrucoTeam, points: number, reason: HandEndReason): TrucoState {
  const matchScore = [...state.matchScore] as [number, number];
  matchScore[winnerTeam] += points;

  const summary: HandSummary = {
    handNumber: state.handNumber,
    envido: state.envido.winnerTeam !== null ? { team: state.envido.winnerTeam, points: state.envido.pointsAwarded } : null,
    flor: state.flor.winnerTeam !== null ? { team: state.flor.winnerTeam, points: state.flor.pointsAwarded } : null,
    truco: { team: winnerTeam, points, reason },
  };

  const scored = finishIfNeeded({ ...state, matchScore, lastHandSummary: summary });
  return scored.finished ? scored : dealNewHand(scored);
}

function closeEnvidoAndFlorWindow(state: TrucoState): TrucoState {
  let next = state;

  if (!next.envido.resolved && next.envido.calls.length === 0) {
    next = { ...next, envido: { ...next.envido, resolved: true } };
  }

  if (next.florEnabled && !next.flor.resolved) {
    if (next.flor.declaredSeats.length === 0) {
      next = { ...next, flor: { ...next.flor, resolved: true } };
    } else {
      const scored = next.flor.declaredSeats.map((s) => ({
        team: teamOf(s, next.playerCount),
        score: calculateEnvido(next.hands[s]),
      }));
      const winner = scored.reduce((best, entry) => (entry.score > best.score ? entry : best));
      const matchScore = [...next.matchScore] as [number, number];
      matchScore[winner.team] += 3;
      next = finishIfNeeded({
        ...next,
        matchScore,
        flor: { ...next.flor, resolved: true, winnerTeam: winner.team, pointsAwarded: 3 },
      });
    }
  }

  return next;
}

function resolveTrick(played: TrucoCard[], playerCount: number): { team: TrucoTeam | "parda"; seat: number | null } {
  let bestPower = -1;
  for (const card of played) bestPower = Math.max(bestPower, cardPower(card));

  const topSeats: number[] = [];
  for (let s = 0; s < playerCount; s++) if (cardPower(played[s]) === bestPower) topSeats.push(s);

  const topTeams = new Set(topSeats.map((s) => teamOf(s, playerCount)));
  if (topTeams.size > 1) return { team: "parda", seat: null };
  return { team: teamOf(topSeats[0], playerCount), seat: topSeats[0] };
}

/** Reglas oficiales de desempate de bazas — ver comentario al inicio del
 * archivo para las simplificaciones asumidas en el resto del motor. */
function resolveHandWinner(trickWinners: (TrucoTeam | "parda")[], manoTeam: TrucoTeam): TrucoTeam | null {
  const [r1, r2, r3] = trickWinners;

  if (trickWinners.length === 2) {
    if (r1 !== "parda" && r2 !== "parda") return r1 === r2 ? r1 : null;
    if (r1 === "parda" && r2 !== "parda") return r2;
    if (r1 !== "parda" && r2 === "parda") return r1;
    return null; // ambas pardas — decide la tercera
  }

  if (trickWinners.length === 3) {
    if (r1 === "parda" && r2 === "parda") return r3 === "parda" ? manoTeam : r3;
    // única forma de llegar acá sin haber decidido antes: primera y segunda
    // decisivas pero de equipos distintos.
    return r3 === "parda" ? (r1 as TrucoTeam) : r3;
  }

  return null;
}

function applyPlayCard(state: TrucoState, seat: number, cardId: string): TrucoState {
  const hand = [...state.hands[seat]];
  const cardIndex = hand.findIndex((c) => c.id === cardId);
  const [card] = hand.splice(cardIndex, 1);
  const hands = [...state.hands];
  hands[seat] = hand;

  const playedThisTrick = [...state.playedThisTrick];
  playedThisTrick[seat] = card;

  let next: TrucoState = { ...state, hands, playedThisTrick };

  if (playedThisTrick.some((c) => c === null)) {
    next.currentSeat = (seat + 1) % state.playerCount;
    return next;
  }

  if (next.trickNumber === 0) {
    next = closeEnvidoAndFlorWindow(next);
    if (next.finished) return next;
  }

  const { team: trickTeam, seat: winningSeat } = resolveTrick(playedThisTrick as TrucoCard[], state.playerCount);
  const trickWinners = [...next.trickWinners, trickTeam];
  next = { ...next, trickWinners };

  const handWinner = resolveHandWinner(trickWinners, teamOf(state.manoSeat, state.playerCount));
  if (handWinner !== null) {
    return endHand(next, handWinner, trucoLevelValue(next.truco.level), "tricks");
  }

  if (trickWinners.length >= 3) {
    // Salvaguarda inalcanzable en la práctica (resolveHandWinner siempre
    // decide para la tercera baza), pero evita dejar la mano trabada.
    return endHand(next, teamOf(state.manoSeat, state.playerCount), trucoLevelValue(next.truco.level), "tricks");
  }

  return {
    ...next,
    trickNumber: next.trickNumber + 1,
    playedThisTrick: Array(state.playerCount).fill(null),
    currentSeat: winningSeat ?? state.manoSeat,
  };
}

// ----------------------------------------------------------------------------
// Interfaz de GameDefinition
// ----------------------------------------------------------------------------

export function isFinished(state: TrucoState): boolean {
  return state.finished;
}

/** Ver nota de simplificaciones al inicio: si hay un canto pendiente, se le
 * pide el movimiento al asiento más bajo del equipo que debe responder —
 * cualquier compañero humano puede responder igual vía la API, esto solo
 * decide a quién le toca actuar cuando es un bot. */
export function getActiveSeat(state: TrucoState): number | null {
  if (state.finished) return null;
  if (state.envido.pending) return state.envido.pending.calledByTeam === 0 ? 1 : 0;
  if (state.truco.pending) return state.truco.pending.calledByTeam === 0 ? 1 : 0;
  return state.currentSeat;
}

export function calculateResult(state: TrucoState): MatchResult {
  const seatResults: SeatResult[] = [];
  for (let seat = 0; seat < state.playerCount; seat++) {
    const team = teamOf(seat, state.playerCount);
    const won = team === state.winnerTeam;
    seatResults.push({ seat, result: won ? "win" : "loss", score: state.matchScore[team], xpEarned: won ? 50 : 10 });
  }
  return { seatResults, summary: { winnerTeam: state.winnerTeam, matchScore: state.matchScore } };
}

export function toPlayerView(state: TrucoState, seat: number): TrucoPlayerView {
  return {
    self: { seat, hand: state.hands[seat] ?? [] },
    playerCount: state.playerCount,
    matchScore: state.matchScore,
    myTeam: teamOf(seat, state.playerCount),
    playedThisTrick: state.playedThisTrick,
    trickNumber: state.trickNumber,
    trickWinners: state.trickWinners,
    currentSeat: state.currentSeat,
    manoSeat: state.manoSeat,
    opponentCardCounts: state.hands.map((h, s) => ({ seat: s, cardCount: h.length })).filter((o) => o.seat !== seat),
    envido: state.envido,
    truco: state.truco,
    flor: state.flor,
    handNumber: state.handNumber,
    finished: state.finished,
    winnerTeam: state.winnerTeam,
    targetScore: state.targetScore,
    lastHandSummary: state.lastHandSummary,
  };
}

export { teamOf, hasFlor, allowedEnvidoRaises, allowedTrucoRaise, trucoLevelValue };
