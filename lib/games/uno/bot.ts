import { pickByDifficulty, type ScoredCandidate } from "@/lib/games/core/bot";
import type { BotDifficulty, GameMove } from "@/lib/games/core/types";
import { ALL_COLORS, isWildCard } from "./deck";
import { legalCardsInHand } from "./rules";
import type { UnoCard, UnoColor, UnoMovePayload, UnoState } from "./types";

function bestColorFor(hand: UnoCard[]): UnoColor {
  const counts: Record<UnoColor, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const card of hand) {
    if (!isWildCard(card.value)) counts[card.color as UnoColor] += 1;
  }
  const best = ALL_COLORS.reduce((a, b) => (counts[b] > counts[a] ? b : a));
  return counts[best] > 0 ? best : ALL_COLORS[Math.floor(Math.random() * ALL_COLORS.length)];
}

/** Higher score = a bot prefers playing this card over others — action
 * cards disrupt opponents more than plain numbers, so a "smarter" bot
 * favors them; an "easy" bot ignores the score entirely (see
 * pickByDifficulty). */
function scoreCard(card: UnoCard): number {
  switch (card.value) {
    case "wild4": return 5;
    case "draw2": return 4;
    case "skip": return 3;
    case "reverse": return 3;
    case "wild": return 2;
    default: return 1;
  }
}

export function getUnoBotMove(state: UnoState, seat: number, difficulty: BotDifficulty): GameMove<UnoMovePayload> {
  if (state.mustCallUnoSeat === seat) {
    return { seat, type: "call_uno", payload: { type: "call_uno" } };
  }

  const hand = state.hands[seat];
  const topCard = state.discard[state.discard.length - 1];
  const legal = legalCardsInHand(hand, topCard, state.currentColor, false);

  if (legal.length === 0) {
    return { seat, type: "draw_card", payload: { type: "draw_card" } };
  }

  const candidates: ScoredCandidate<UnoCard>[] = legal.map((card) => ({ move: card, score: scoreCard(card) }));
  const card = pickByDifficulty(candidates, difficulty);

  const chosenColor = isWildCard(card.value) ? bestColorFor(hand.filter((c) => c.id !== card.id)) : undefined;

  return {
    seat,
    type: "play_card",
    payload: { type: "play_card", cardId: card.id, chosenColor },
  };
}
