import { createSeededRandom, shuffle } from "@/lib/games/core/rng";
import type { GameMove, GameSetupContext, MatchResult, MoveValidation } from "@/lib/games/core/types";
import { ALL_COLORS, buildDeck, canPlayOn, cardPoints, isWildCard } from "./deck";
import type { UnoCard, UnoColor, UnoMovePayload, UnoPlayerView, UnoState } from "./types";

const HAND_SIZE = 7;

function rngFor(state: Pick<UnoState, "seed" | "rngCounter">) {
  return createSeededRandom(`${state.seed}:${state.rngCounter}`);
}

export function createInitialState(ctx: GameSetupContext): UnoState {
  const playerCount = ctx.players.length;
  const rng = createSeededRandom(`${ctx.seed}:0`);
  const deck = shuffle(buildDeck(), rng);

  const hands: UnoCard[][] = Array.from({ length: playerCount }, () => []);
  for (let i = 0; i < HAND_SIZE; i++) {
    for (let seat = 0; seat < playerCount; seat++) {
      hands[seat].push(deck.pop()!);
    }
  }

  const topCard = deck.pop()!;
  // Simplificación deliberada: si la primera carta del mazo es un
  // wild/wild4, no se aplican sus efectos (nadie roba, no se salta a
  // nadie) — solo fija el color inicial. Evita el caso ambiguo de
  // "¿quién roba antes de que alguien haya jugado?" en la primera carta.
  let currentColor: UnoColor;
  if (isWildCard(topCard.value)) {
    currentColor = ALL_COLORS[Math.floor(rng() * ALL_COLORS.length)];
  } else {
    currentColor = topCard.color as UnoColor;
  }

  return {
    seed: ctx.seed,
    rngCounter: 1,
    deck,
    discard: [topCard],
    hands,
    playerCount,
    currentSeat: 0,
    direction: 1,
    currentColor,
    mustCallUnoSeat: null,
    finished: false,
    winnerSeat: null,
    turnCount: 0,
  };
}

function topOfDiscard(state: UnoState): UnoCard {
  return state.discard[state.discard.length - 1];
}

/** Draws `count` cards, reshuffling discard (minus its top card) back into
 * the deck if it runs out mid-draw. Mutates and returns the same arrays the
 * caller passed in (callers are expected to have already cloned them). */
function drawCards(state: UnoState, count: number): UnoCard[] {
  const drawn: UnoCard[] = [];
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) {
      if (state.discard.length <= 1) break; // nothing left anywhere — deck exhausted
      const top = state.discard.pop()!;
      state.deck = shuffle(state.discard, rngFor(state));
      state.rngCounter += 1;
      state.discard = [top];
    }
    const card = state.deck.pop();
    if (!card) break;
    drawn.push(card);
  }
  return drawn;
}

function seatAfter(state: Pick<UnoState, "playerCount" | "direction">, from: number, steps: number): number {
  const n = state.playerCount;
  return ((from + steps * state.direction) % n + n) % n;
}

export function legalCardsInHand(hand: UnoCard[], topCard: UnoCard, currentColor: UnoColor, allowWild4: boolean): UnoCard[] {
  const hasNonWildMatch = hand.some((c) => !isWildCard(c.value) && canPlayOn(c, topCard, currentColor));
  return hand.filter((c) => {
    if (c.value === "wild4") return allowWild4 || !hasNonWildMatch;
    return canPlayOn(c, topCard, currentColor);
  });
}

export function validateMove(state: UnoState, move: GameMove<UnoMovePayload>): MoveValidation {
  if (state.finished) return { valid: false, reason: "La partida ya terminó" };
  const payload = move.payload;

  if (payload.type === "call_uno") {
    if (state.hands[move.seat]?.length !== 1) {
      return { valid: false, reason: "Solo podés cantar UNO cuando te queda una carta" };
    }
    return { valid: true };
  }

  if (payload.type === "challenge_uno") {
    if (payload.targetSeat === move.seat) return { valid: false, reason: "No podés desafiarte a vos mismo" };
    if (state.mustCallUnoSeat !== payload.targetSeat) {
      return { valid: false, reason: "Ese jugador no está expuesto a un desafío de UNO" };
    }
    return { valid: true };
  }

  if (move.seat !== state.currentSeat) {
    return { valid: false, reason: "No es tu turno" };
  }

  const hand = state.hands[move.seat];

  if (payload.type === "draw_card") {
    return { valid: true };
  }

  if (payload.type === "play_card") {
    const card = hand.find((c) => c.id === payload.cardId);
    if (!card) return { valid: false, reason: "No tenés esa carta" };

    const topCard = topOfDiscard(state);
    if (!canPlayOn(card, topCard, state.currentColor)) {
      return { valid: false, reason: "Esa carta no se puede jugar ahora" };
    }

    if (card.value === "wild4") {
      const hasMatchingColor = hand.some((c) => !isWildCard(c.value) && c.color === state.currentColor);
      if (hasMatchingColor) {
        return { valid: false, reason: "Solo podés jugar +4 si no tenés ninguna carta del color actual" };
      }
    }

    if (isWildCard(card.value) && !payload.chosenColor) {
      return { valid: false, reason: "Elegí un color para la carta especial" };
    }

    return { valid: true };
  }

  return { valid: false, reason: "Movimiento desconocido" };
}

export function applyMove(state: UnoState, move: GameMove<UnoMovePayload>): UnoState {
  const payload = move.payload;
  const next: UnoState = {
    ...state,
    deck: [...state.deck],
    discard: [...state.discard],
    hands: state.hands.map((h) => [...h]),
  };

  if (payload.type === "call_uno") {
    if (next.mustCallUnoSeat === move.seat) next.mustCallUnoSeat = null;
    return next;
  }

  if (payload.type === "challenge_uno") {
    const penalty = drawCards(next, 2);
    next.hands[payload.targetSeat] = [...next.hands[payload.targetSeat], ...penalty];
    next.mustCallUnoSeat = null;
    return next;
  }

  if (payload.type === "draw_card") {
    const drawn = drawCards(next, 1);
    next.hands[move.seat] = [...next.hands[move.seat], ...drawn];
    next.currentSeat = seatAfter(next, move.seat, 1);
    next.turnCount += 1;
    return next;
  }

  // play_card
  const hand = next.hands[move.seat];
  const cardIndex = hand.findIndex((c) => c.id === payload.cardId);
  const [card] = hand.splice(cardIndex, 1);
  next.discard = [...next.discard, card];

  let steps = 1;
  let drawForNext = 0;

  switch (card.value) {
    case "skip":
      steps = 2;
      break;
    case "reverse":
      if (next.playerCount > 2) next.direction = next.direction === 1 ? -1 : 1;
      steps = next.playerCount === 2 ? 2 : 1;
      break;
    case "draw2":
      steps = 2;
      drawForNext = 2;
      break;
    case "wild4":
      steps = 2;
      drawForNext = 4;
      break;
    default:
      steps = 1;
  }

  next.currentColor = isWildCard(card.value) ? payload.chosenColor! : (card.color as UnoColor);

  if (hand.length === 0) {
    next.finished = true;
    next.winnerSeat = move.seat;
    next.mustCallUnoSeat = null;
    return next;
  }

  if (hand.length === 1) {
    next.mustCallUnoSeat = move.seat;
  } else if (next.mustCallUnoSeat === move.seat) {
    next.mustCallUnoSeat = null;
  }

  if (drawForNext > 0) {
    const drawnSeat = seatAfter(next, move.seat, 1);
    const drawn = drawCards(next, drawForNext);
    next.hands[drawnSeat] = [...next.hands[drawnSeat], ...drawn];
  }

  next.currentSeat = seatAfter(next, move.seat, steps);
  next.turnCount += 1;

  return next;
}

export function isFinished(state: UnoState): boolean {
  return state.finished;
}

export function getActiveSeat(state: UnoState): number | null {
  return state.finished ? null : state.currentSeat;
}

export function calculateResult(state: UnoState): MatchResult {
  const winnerSeat = state.winnerSeat;

  const seatResults = state.hands.map((hand, seat) => {
    if (seat === winnerSeat) return { seat, result: "win" as const, score: 0, xpEarned: 0 };
    return { seat, result: "loss" as const, score: 0, xpEarned: 0 };
  });

  if (winnerSeat !== null) {
    const points = state.hands.reduce((sum, hand, seat) => {
      if (seat === winnerSeat) return sum;
      return sum + hand.reduce((s, c) => s + cardPoints(c), 0);
    }, 0);

    const winner = seatResults.find((r) => r.seat === winnerSeat)!;
    winner.score = points;
    winner.xpEarned = 50 + Math.round(points / 10);

    for (const result of seatResults) {
      if (result.seat !== winnerSeat) result.xpEarned = 10;
    }
  }

  return {
    seatResults,
    summary: { winnerSeat, points: seatResults.find((r) => r.seat === winnerSeat)?.score ?? 0 },
  };
}

export function toPlayerView(state: UnoState, seat: number): UnoPlayerView {
  return {
    self: { seat, hand: state.hands[seat] ?? [] },
    opponents: state.hands.map((hand, s) => ({ seat: s, cardCount: hand.length })).filter((o) => o.seat !== seat),
    deckCount: state.deck.length,
    topCard: state.discard.length > 0 ? topOfDiscard(state) : null,
    currentColor: state.currentColor,
    currentSeat: state.currentSeat,
    direction: state.direction,
    mustCallUnoSeat: state.mustCallUnoSeat,
    finished: state.finished,
    winnerSeat: state.winnerSeat,
    turnCount: state.turnCount,
  };
}
