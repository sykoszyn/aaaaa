import type { BotDifficulty, GameMove } from "@/lib/games/core/types";
import { cardPower } from "./deck";
import { calculateEnvido } from "./envido";
import { allowedEnvidoRaises, allowedTrucoRaise, hasFlor, teamOf, trucoLevelValue } from "./rules";
import type { TrucoCard, TrucoMovePayload, TrucoState, TrucoTeam } from "./types";

/**
 * Heurísticas simples y deliberadamente legibles — no un solver de Truco.
 * Cada decisión compara un puntaje contra un umbral que varía por
 * dificultad, con algo de aleatoriedad para que "easy" no sea 100%
 * predecible. No hace falta que sea determinístico como applyMove: la
 * selección del bot no es parte del estado persistido, solo el resultado
 * de la jugada que elige sí lo es (mismo criterio que lib/games/uno/bot.ts).
 */

const ENVIDO_ACCEPT_THRESHOLD: Record<BotDifficulty, number> = { easy: 17, normal: 22, hard: 26 };
const TRUCO_ACCEPT_THRESHOLD: Record<BotDifficulty, number> = { easy: 12, normal: 15, hard: 18 };
const CALL_CHANCE: Record<BotDifficulty, number> = { easy: 0.15, normal: 0.35, hard: 0.55 };

/** Fuerza de una mano de truco: suma del poder de las dos cartas más
 * fuertes (0-13 cada una; una mano con dos piezas es prácticamente
 * imbatible, una con cartas bajas casi no vale nada). */
function handStrength(hand: TrucoCard[]): number {
  const powers = hand.map(cardPower).sort((a, b) => b - a);
  return (powers[0] ?? 0) + (powers[1] ?? 0);
}

function respondBid(seat: number, accept: boolean): GameMove<TrucoMovePayload> {
  return { seat, type: "respond_bid", payload: { type: "respond_bid", accept } };
}

function decideEnvidoResponse(state: TrucoState, seat: number, difficulty: BotDifficulty): GameMove<TrucoMovePayload> {
  const score = calculateEnvido(state.hands[seat]);
  const pending = state.envido.pending!;

  if (difficulty === "hard" && score >= 31) {
    const allowed = allowedEnvidoRaises(state.envido.calls).filter((l) => l !== pending.level);
    if (allowed.length > 0) {
      return { seat, type: "call_envido", payload: { type: "call_envido", level: allowed[0] } };
    }
  }

  return respondBid(seat, score >= ENVIDO_ACCEPT_THRESHOLD[difficulty]);
}

function decideTrucoResponse(state: TrucoState, seat: number, difficulty: BotDifficulty): GameMove<TrucoMovePayload> {
  const strength = handStrength(state.hands[seat]);
  const pending = state.truco.pending!;

  if (strength >= 24 && Math.random() < CALL_CHANCE[difficulty]) {
    const raise = allowedTrucoRaise(pending.level);
    if (raise) return { seat, type: "call_truco", payload: { type: "call_truco", level: raise } };
  }

  return respondBid(seat, strength >= TRUCO_ACCEPT_THRESHOLD[difficulty]);
}

/** Elige qué carta jugar: si va ganando la baza o es la última carta, tira
 * la más baja que alcance; si va perdiendo, sube con la más fuerte que le
 * quede. Nunca quema una pieza si una carta más floja ya alcanza. */
function chooseCardToPlay(state: TrucoState, seat: number): TrucoCard {
  const hand = state.hands[seat];
  const played = state.playedThisTrick.filter((c): c is TrucoCard => c !== null);
  const sorted = [...hand].sort((a, b) => cardPower(a) - cardPower(b));

  if (played.length === 0) {
    // Primero en la baza: tira la más baja para reservar fuerza, salvo que
    // sea la última carta de la mano.
    return sorted[0];
  }

  const bestRivalPower = Math.max(...played.map(cardPower));
  const winningCard = sorted.find((c) => cardPower(c) > bestRivalPower);
  return winningCard ?? sorted[0];
}

function shouldCallEnvido(score: number, difficulty: BotDifficulty): boolean {
  const threshold = ENVIDO_ACCEPT_THRESHOLD[difficulty] + 2;
  return score >= threshold && Math.random() < CALL_CHANCE[difficulty];
}

function shouldCallTruco(strength: number, difficulty: BotDifficulty): boolean {
  return strength >= TRUCO_ACCEPT_THRESHOLD[difficulty] + 3 && Math.random() < CALL_CHANCE[difficulty];
}

function shouldFold(strength: number, level: TrucoState["truco"]["level"], difficulty: BotDifficulty): boolean {
  if (!level) return false;
  const desperation = trucoLevelValue(level); // 2, 3 o 4
  return strength < TRUCO_ACCEPT_THRESHOLD[difficulty] - desperation * 2;
}

export function getTrucoBotMove(state: TrucoState, seat: number, difficulty: BotDifficulty): GameMove<TrucoMovePayload> {
  const team: TrucoTeam = teamOf(seat, state.playerCount);
  const hand = state.hands[seat];

  if (state.envido.pending && team !== state.envido.pending.calledByTeam) {
    return decideEnvidoResponse(state, seat, difficulty);
  }

  if (state.truco.pending && team !== state.truco.pending.calledByTeam) {
    return decideTrucoResponse(state, seat, difficulty);
  }

  if (state.florEnabled && state.trickNumber === 0 && hasFlor(hand) && !state.flor.declaredSeats.includes(seat)) {
    return { seat, type: "declare_flor", payload: { type: "declare_flor" } };
  }

  if (state.trickNumber === 0 && !state.envido.resolved && !state.envido.pending && state.flor.declaredSeats.length === 0) {
    const score = calculateEnvido(hand);
    if (shouldCallEnvido(score, difficulty)) {
      return { seat, type: "call_envido", payload: { type: "call_envido", level: "envido" } };
    }
  }

  const strength = handStrength(hand);

  if (!state.truco.pending && state.truco.calledByTeam !== team) {
    const nextLevel = allowedTrucoRaise(state.truco.level);
    if (nextLevel && shouldCallTruco(strength, difficulty)) {
      return { seat, type: "call_truco", payload: { type: "call_truco", level: nextLevel } };
    }
  }

  if (shouldFold(strength, state.truco.level, difficulty)) {
    return { seat, type: "go_to_deck", payload: { type: "go_to_deck" } };
  }

  return { seat, type: "play_card", payload: { type: "play_card", cardId: chooseCardToPlay(state, seat).id } };
}
