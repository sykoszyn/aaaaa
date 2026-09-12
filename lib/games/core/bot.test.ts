import { describe, expect, it } from "vitest";
import { pickByDifficulty } from "./bot";

describe("pickByDifficulty", () => {
  const candidates = [
    { move: "low", score: 1 },
    { move: "mid", score: 5 },
    { move: "high", score: 10 },
  ];

  it("hard always takes the best-scoring candidate", () => {
    for (let i = 0; i < 20; i++) {
      expect(pickByDifficulty(candidates, "hard")).toBe("high");
    }
  });

  it("easy ignores score and can return any candidate", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(pickByDifficulty(candidates, "easy"));
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it("returns the only candidate when there is just one", () => {
    expect(pickByDifficulty([{ move: "only", score: 0 }], "normal")).toBe("only");
  });

  it("throws on an empty candidate list", () => {
    expect(() => pickByDifficulty([], "hard")).toThrow();
  });
});
