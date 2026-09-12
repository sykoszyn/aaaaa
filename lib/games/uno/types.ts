export type UnoColor = "red" | "yellow" | "green" | "blue";

export type UnoValue =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "skip" | "reverse" | "draw2" | "wild" | "wild4";

export interface UnoCard {
  id: string;
  /** "wild" for wild/wild4 cards until (and unless) they've been played and
   * a color was chosen — the chosen color lives on UnoState.currentColor,
   * never mutated onto the card itself, since a wild in someone's hand has
   * no color. */
  color: UnoColor | "wild";
  value: UnoValue;
}

export interface UnoState {
  seed: string;
  /** Bumped every time we need a fresh shuffle stream (initial deal,
   * reshuffling the discard pile back into the deck) — keeps applyMove a
   * pure function of (state, move) while still varying across shuffles.
   * See lib/games/core/rng.ts. */
  rngCounter: number;
  deck: UnoCard[];
  discard: UnoCard[];
  hands: UnoCard[][];
  playerCount: number;
  currentSeat: number;
  direction: 1 | -1;
  currentColor: UnoColor;
  /** Seat that just dropped to exactly one card and hasn't announced UNO
   * yet — any other seat can `challenge_uno` against them until they take
   * their next play_card/draw_card turn. */
  mustCallUnoSeat: number | null;
  finished: boolean;
  winnerSeat: number | null;
  turnCount: number;
}

export type UnoMovePayload =
  | { type: "play_card"; cardId: string; chosenColor?: UnoColor }
  | { type: "draw_card" }
  | { type: "call_uno" }
  | { type: "challenge_uno"; targetSeat: number };

/** What a given seat is allowed to see — opponents are counts, never cards. */
export interface UnoPlayerView {
  self: { seat: number; hand: UnoCard[] };
  opponents: { seat: number; cardCount: number }[];
  deckCount: number;
  topCard: UnoCard | null;
  currentColor: UnoColor;
  currentSeat: number;
  direction: 1 | -1;
  mustCallUnoSeat: number | null;
  finished: boolean;
  winnerSeat: number | null;
  turnCount: number;
}
