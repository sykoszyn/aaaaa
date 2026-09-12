import type { TrucoCard, TrucoSuit, TrucoValue } from "./types";

const SUITS: TrucoSuit[] = ["oro", "copa", "espada", "basto"];
const VALUES: TrucoValue[] = ["1", "2", "3", "4", "5", "6", "7", "10", "11", "12"];

/** Mazo español de 40 cartas (sin 8 ni 9). */
export function buildDeck(): TrucoCard[] {
  const cards: TrucoCard[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      cards.push({ id: `${suit}-${value}`, suit, value });
    }
  }
  return cards;
}

/**
 * Jerarquía real del Truco Argentino, de más baja a más alta, agrupada en
 * "escalones": TODAS las cartas de un mismo escalón valen exactamente lo
 * mismo para ganar una baza (ej. los cuatro "4" empatan entre sí — si se
 * enfrentan, la baza es "parda"). Las piezas y los "falsos" son las únicas
 * excepciones que separan a cartas del mismo número en escalones distintos.
 */
const RANK_TIERS: readonly (readonly string[])[] = [
  ["oro-4", "copa-4", "espada-4", "basto-4"],
  ["oro-5", "copa-5", "espada-5", "basto-5"],
  ["oro-6", "copa-6", "espada-6", "basto-6"],
  ["copa-7", "basto-7"], // "sietes falsos"
  ["oro-10", "copa-10", "espada-10", "basto-10"],
  ["oro-11", "copa-11", "espada-11", "basto-11"],
  ["oro-12", "copa-12", "espada-12", "basto-12"],
  ["copa-1", "oro-1"], // "anchos falsos"
  ["oro-2", "copa-2", "espada-2", "basto-2"],
  ["oro-3", "copa-3", "espada-3", "basto-3"],
  ["oro-7"], // "siete de oro"
  ["espada-7"], // "siete de espada"
  ["basto-1"], // "ancho de basto"
  ["espada-1"], // "ancho de espada" — la más alta de todo el mazo
];

const RANK_BY_ID = new Map(RANK_TIERS.flatMap((tier, tierIndex) => tier.map((id) => [id, tierIndex] as const)));

/** Mayor número = carta más fuerte. Cartas del mismo escalón devuelven el
 * mismo valor a propósito — así una baza entre ellas sale "parda". */
export function cardPower(card: TrucoCard): number {
  const power = RANK_BY_ID.get(card.id);
  if (power === undefined) throw new Error(`Carta desconocida: ${card.id}`);
  return power;
}

/** Valor de la carta para el cálculo del envido: 1-7 valen su número, las
 * figuras (10, 11, 12) valen 0. */
export function envidoCardValue(card: TrucoCard): number {
  return Number(card.value) > 7 ? 0 : Number(card.value);
}

export const ALL_SUITS = SUITS;
