import type { BotDifficulty } from "./types";

/**
 * Bots run in-process on the server (no external AI calls, no network
 * hop) so a bot's move is just a normal function call inside the same
 * request that resolved the preceding human move — see
 * lib/games/core/engine.ts `runMoveLoop`. Each game implements its own
 * `getBotMove`; this file only holds difficulty-agnostic helpers so games
 * don't reinvent "pick the best of N candidates" every time.
 */

export interface ScoredCandidate<T> {
  move: T;
  score: number;
}

/**
 * Picks among candidates according to difficulty:
 * - easy: uniformly random, ignores score entirely.
 * - normal: random pick weighted towards higher scores.
 * - hard: always the highest-scoring candidate.
 */
export function pickByDifficulty<T>(candidates: ScoredCandidate<T>[], difficulty: BotDifficulty): T {
  if (candidates.length === 0) throw new Error("pickByDifficulty called with no candidates");
  if (candidates.length === 1) return candidates[0].move;

  if (difficulty === "easy") {
    return candidates[Math.floor(Math.random() * candidates.length)].move;
  }

  if (difficulty === "hard") {
    return candidates.reduce((best, c) => (c.score > best.score ? c : best)).move;
  }

  const minScore = Math.min(...candidates.map((c) => c.score));
  const weights = candidates.map((c) => c.score - minScore + 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return candidates[i].move;
  }
  return candidates[candidates.length - 1].move;
}
