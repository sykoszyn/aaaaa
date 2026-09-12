import { describe, expect, it } from "vitest";
import { createSeededRandom, shuffle } from "./rng";

describe("createSeededRandom", () => {
  it("is deterministic for the same seed", () => {
    const a = createSeededRandom("match-123");
    const b = createSeededRandom("match-123");
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("differs across seeds", () => {
    const a = createSeededRandom("match-123");
    const b = createSeededRandom("match-456");
    expect(a()).not.toBe(b());
  });

  it("always returns a value in [0, 1)", () => {
    const rng = createSeededRandom("range-check");
    for (let i = 0; i < 200; i++) {
      const value = rng();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("shuffle", () => {
  it("is a reproducible permutation of the input for a given rng stream", () => {
    const items = Array.from({ length: 40 }, (_, i) => i);
    const shuffledA = shuffle(items, createSeededRandom("deck-seed"));
    const shuffledB = shuffle(items, createSeededRandom("deck-seed"));

    expect(shuffledA).toEqual(shuffledB);
    expect(shuffledA).not.toEqual(items);
    expect([...shuffledA].sort((x, y) => x - y)).toEqual(items);
  });

  it("does not mutate the original array", () => {
    const items = [1, 2, 3, 4, 5];
    shuffle(items, createSeededRandom("no-mutate"));
    expect(items).toEqual([1, 2, 3, 4, 5]);
  });
});
