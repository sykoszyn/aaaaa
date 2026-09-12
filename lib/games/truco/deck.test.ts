import { describe, expect, it } from "vitest";
import { buildDeck, cardPower } from "./deck";
import { calculateEnvido } from "./envido";
import type { TrucoCard } from "./types";

function card(suit: TrucoCard["suit"], value: TrucoCard["value"]): TrucoCard {
  return { id: `${suit}-${value}`, suit, value };
}

describe("buildDeck", () => {
  it("has exactly 40 unique Spanish cards", () => {
    const deck = buildDeck();
    expect(deck).toHaveLength(40);
    expect(new Set(deck.map((c) => c.id)).size).toBe(40);
  });
});

describe("cardPower: jerarquía del truco", () => {
  it("ranks espada-1 as the single highest card in the deck", () => {
    const deck = buildDeck();
    const top = deck.reduce((best, c) => (cardPower(c) > cardPower(best) ? c : best));
    expect(top.id).toBe("espada-1");
  });

  it("orders the four piezas correctly: espada1 > basto1 > espada7 > oro7", () => {
    expect(cardPower(card("espada", "1"))).toBeGreaterThan(cardPower(card("basto", "1")));
    expect(cardPower(card("basto", "1"))).toBeGreaterThan(cardPower(card("espada", "7")));
    expect(cardPower(card("espada", "7"))).toBeGreaterThan(cardPower(card("oro", "7")));
    expect(cardPower(card("oro", "7"))).toBeGreaterThan(cardPower(card("basto", "3")));
  });

  it("ranks any 3 above any 2, any 2 above the anchos falsos (1 de oro/copa)", () => {
    expect(cardPower(card("oro", "3"))).toBeGreaterThan(cardPower(card("copa", "2")));
    expect(cardPower(card("basto", "2"))).toBeGreaterThan(cardPower(card("oro", "1")));
    expect(cardPower(card("copa", "1"))).toBeGreaterThan(cardPower(card("espada", "12")));
  });

  it("ranks the sietes falsos (7 de copa/basto) above the 6 but below the figuras (10/11/12)", () => {
    expect(cardPower(card("copa", "7"))).toBeGreaterThan(cardPower(card("espada", "6")));
    expect(cardPower(card("oro", "12"))).toBeGreaterThan(cardPower(card("copa", "7")));
  });

  it("ranks the lowest card as any 4", () => {
    const deck = buildDeck();
    const bottom = deck.reduce((worst, c) => (cardPower(c) < cardPower(worst) ? c : worst));
    expect(bottom.value).toBe("4");
  });
});

describe("calculateEnvido", () => {
  it("sums the two highest cards of a matching suit plus 20", () => {
    const hand = [card("oro", "7"), card("oro", "5"), card("copa", "3")];
    expect(calculateEnvido(hand)).toBe(20 + 7 + 5);
  });

  it("treats figuras (10/11/12) as 0 for envido purposes", () => {
    const hand = [card("oro", "12"), card("oro", "4"), card("copa", "1")];
    expect(calculateEnvido(hand)).toBe(20 + 4 + 0);
  });

  it("uses only the single highest card when no two share a suit", () => {
    const hand = [card("oro", "7"), card("copa", "3"), card("espada", "12")];
    expect(calculateEnvido(hand)).toBe(7);
  });

  it("picks the best pair when all three cards share a suit", () => {
    const hand = [card("basto", "7"), card("basto", "6"), card("basto", "1")];
    expect(calculateEnvido(hand)).toBe(20 + 7 + 6);
  });
});
