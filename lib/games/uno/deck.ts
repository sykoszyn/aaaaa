import type { UnoCard, UnoColor, UnoValue } from "./types";

const COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];
const NUMBER_VALUES: UnoValue[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/** Standard 108-card UNO deck: per color, one 0 + two each of 1-9, two Skip,
 * two Reverse, two Draw Two; plus four Wild and four Wild Draw Four. */
export function buildDeck(): UnoCard[] {
  const cards: UnoCard[] = [];
  let n = 0;
  const push = (color: UnoCard["color"], value: UnoValue) => cards.push({ id: `c${n++}`, color, value });

  for (const color of COLORS) {
    for (const value of NUMBER_VALUES) {
      push(color, value);
      if (value !== "0") push(color, value);
    }
    push(color, "skip");
    push(color, "skip");
    push(color, "reverse");
    push(color, "reverse");
    push(color, "draw2");
    push(color, "draw2");
  }

  for (let i = 0; i < 4; i++) push("wild", "wild");
  for (let i = 0; i < 4; i++) push("wild", "wild4");

  return cards;
}

export function isActionCard(value: UnoValue): boolean {
  return value === "skip" || value === "reverse" || value === "draw2";
}

export function isWildCard(value: UnoValue): boolean {
  return value === "wild" || value === "wild4";
}

/** Can `card` be legally played on top of `topCard`, given the active color? */
export function canPlayOn(card: UnoCard, topCard: UnoCard, currentColor: UnoColor): boolean {
  if (isWildCard(card.value)) return true;
  if (card.color === currentColor) return true;
  if (!isWildCard(topCard.value) && card.value === topCard.value) return true;
  return false;
}

export const ALL_COLORS = COLORS;

/** Standard UNO scoring value of a single card, for tallying the winner's
 * points from everyone else's remaining hands. */
export function cardPoints(card: UnoCard): number {
  if (card.value === "wild" || card.value === "wild4") return 50;
  if (isActionCard(card.value)) return 20;
  return Number(card.value);
}

