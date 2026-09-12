import { envidoCardValue } from "./deck";
import type { EnvidoLevel, TrucoCard } from "./types";

/**
 * Puntaje de envido de una mano de 3 cartas:
 * - Si dos (o las tres) comparten palo, se suman las dos de mayor valor de
 *   ese palo + 20.
 * - Si ninguna comparte palo, el puntaje es el valor de la carta más alta
 *   (sin el +20) — es "no tener envido", solo la mejor carta cuenta.
 */
export function calculateEnvido(hand: TrucoCard[]): number {
  const bySuit = new Map<string, TrucoCard[]>();
  for (const card of hand) {
    const list = bySuit.get(card.suit) ?? [];
    list.push(card);
    bySuit.set(card.suit, list);
  }

  let best = 0;
  let hasPair = false;

  for (const cards of bySuit.values()) {
    if (cards.length >= 2) {
      hasPair = true;
      const values = cards.map(envidoCardValue).sort((a, b) => b - a);
      const score = 20 + values[0] + values[1];
      if (score > best) best = score;
    }
  }

  if (!hasPair) {
    best = Math.max(...hand.map(envidoCardValue));
  }

  return best;
}

/**
 * Puntos que se lleva el ganador cuando se acepta ("quiero") toda la
 * secuencia cantada. "envido" vale 2, "real_envido" vale 3, y se suman
 * todos los cantos de la secuencia (ej. envido+envido = 4, envido+real
 * envido = 5). "falta_envido" reemplaza a la suma: el ganador se lleva
 * exactamente los puntos que le faltan para llegar a targetScore.
 */
export function envidoAcceptPoints(calls: EnvidoLevel[], winnerCurrentScore: number, targetScore: number): number {
  if (calls.includes("falta_envido")) {
    return Math.max(1, targetScore - winnerCurrentScore);
  }
  return calls.reduce((sum, level) => sum + (level === "envido" ? 2 : 3), 0);
}

/**
 * Puntos que se lleva quien cantó si el rival dice "no quiero": cada grito
 * de la secuencia (envido, real_envido o falta_envido) vale 1 tanto sin
 * importar su valor si se acepta. Ej: [envido] rechazado = 1.
 * [envido, envido] = 2. [envido, real_envido] = 2.
 */
export function envidoDeclineValue(calls: EnvidoLevel[]): number {
  return calls.length;
}
