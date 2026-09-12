/**
 * Deterministic PRNG (mulberry32) seeded from a string. Every game with
 * randomness (UNO shuffles, Ludo dice, bot decisions) must derive its
 * randomness from `GameSetupContext.seed` + the current event sequence
 * number through this — never `Math.random()` — so the same seed always
 * replays the same match, which is what makes reconnection and the
 * game_events audit log meaningful.
 */
export function createSeededRandom(seed: string) {
  let a = hashSeed(seed);

  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

/** Fisher-Yates shuffle using a seeded RNG — deterministic given the same rng stream. */
export function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
