import { describe, expect, it } from "vitest";
import type { GameMove } from "@/lib/games/core/types";
import {
  applyMove,
  calculateResult,
  createInitialState,
  getActiveSeat,
  isFinished,
  validateMove,
} from "./rules";
import type { UnoCard, UnoMovePayload, UnoState } from "./types";

function card(id: string, color: UnoCard["color"], value: UnoCard["value"]): UnoCard {
  return { id, color, value };
}

/** Hand-crafted state for deterministic rule tests — bypasses the random
 * deal in createInitialState so each test only exercises the one rule it
 * names. `deck` is padded with plain filler cards so draws never run out. */
function fixture(overrides: Partial<UnoState>): UnoState {
  const filler = Array.from({ length: 20 }, (_, i) => card(`filler-${i}`, "red", "3"));
  return {
    seed: "test-seed",
    rngCounter: 1,
    deck: filler,
    discard: [card("d0", "red", "5")],
    hands: [
      [card("h0-a", "red", "1"), card("h0-b", "blue", "2")],
      [card("h1-a", "green", "4"), card("h1-b", "yellow", "6")],
    ],
    playerCount: 2,
    currentSeat: 0,
    direction: 1,
    currentColor: "red",
    mustCallUnoSeat: null,
    finished: false,
    winnerSeat: null,
    turnCount: 0,
    ...overrides,
  };
}

function move(seat: number, payload: UnoMovePayload): GameMove<UnoMovePayload> {
  return { seat, type: payload.type, payload };
}

describe("createInitialState", () => {
  it("deals 7 cards to each player and is deterministic for the same seed", () => {
    const players = [
      { seat: 0, profileId: "p0", isBot: false },
      { seat: 1, profileId: "p1", isBot: false },
      { seat: 2, profileId: null, isBot: true },
    ];
    const a = createInitialState({ players, settings: {}, seed: "match-seed" });
    const b = createInitialState({ players, settings: {}, seed: "match-seed" });

    expect(a.hands).toHaveLength(3);
    for (const hand of a.hands) expect(hand).toHaveLength(7);
    expect(a.discard).toHaveLength(1);
    expect(a.currentSeat).toBe(0);
    expect(a.direction).toBe(1);
    expect(a).toEqual(b);
  });

  it("deals no duplicate card instances across hands and the discard", () => {
    const players = [
      { seat: 0, profileId: "p0", isBot: false },
      { seat: 1, profileId: "p1", isBot: false },
    ];
    const state = createInitialState({ players, settings: {}, seed: "dup-check" });
    const allIds = [...state.hands.flat().map((c) => c.id), ...state.discard.map((c) => c.id)];
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});

describe("validateMove: turnos y legalidad", () => {
  it("rejects a move from a seat that isn't the current turn", () => {
    const state = fixture({});
    const result = validateMove(state, move(1, { type: "draw_card" }));
    expect(result.valid).toBe(false);
  });

  it("rejects playing a card the seat doesn't hold", () => {
    const state = fixture({});
    const result = validateMove(state, move(0, { type: "play_card", cardId: "not-mine" }));
    expect(result.valid).toBe(false);
  });

  it("rejects a card that doesn't match color or value", () => {
    // top is red-5; hand has red-1 (legal by color) and blue-2 (illegal)
    const state = fixture({});
    expect(validateMove(state, move(0, { type: "play_card", cardId: "h0-b" })).valid).toBe(false);
    expect(validateMove(state, move(0, { type: "play_card", cardId: "h0-a" })).valid).toBe(true);
  });

  it("requires a chosen color when playing a wild card", () => {
    const state = fixture({ hands: [[card("w", "wild", "wild"), card("x", "red", "1")], fixture({}).hands[1]] });
    expect(validateMove(state, move(0, { type: "play_card", cardId: "w" })).valid).toBe(false);
    expect(validateMove(state, move(0, { type: "play_card", cardId: "w", chosenColor: "blue" })).valid).toBe(true);
  });

  it("rejects +4 when the player still holds a card of the current color", () => {
    const state = fixture({
      hands: [[card("w4", "wild", "wild4"), card("r1", "red", "1")], fixture({}).hands[1]],
    });
    const result = validateMove(state, move(0, { type: "play_card", cardId: "w4", chosenColor: "blue" }));
    expect(result.valid).toBe(false);
  });

  it("allows +4 when the player has no card of the current color", () => {
    const state = fixture({
      hands: [[card("w4", "wild", "wild4"), card("b1", "blue", "1")], fixture({}).hands[1]],
    });
    const result = validateMove(state, move(0, { type: "play_card", cardId: "w4", chosenColor: "blue" }));
    expect(result.valid).toBe(true);
  });

  it("rejects any move once the match is finished", () => {
    const state = fixture({ finished: true, winnerSeat: 0 });
    expect(validateMove(state, move(0, { type: "draw_card" })).valid).toBe(false);
  });
});

describe("applyMove: efectos de cada carta", () => {
  it("a plain number card advances the turn by one seat", () => {
    const state = fixture({ playerCount: 3, hands: [...fixture({}).hands, [card("h2", "red", "9")]] });
    const next = applyMove(state, move(0, { type: "play_card", cardId: "h0-a" }));
    expect(next.currentSeat).toBe(1);
    expect(next.discard.at(-1)?.id).toBe("h0-a");
  });

  it("skip jumps over the next player", () => {
    const state = fixture({
      playerCount: 3,
      hands: [[card("s", "red", "skip"), card("filler0", "red", "3")], fixture({}).hands[1], [card("h2", "red", "9")]],
    });
    const next = applyMove(state, move(0, { type: "play_card", cardId: "s" }));
    expect(next.currentSeat).toBe(2);
  });

  it("reverse flips direction and moves to the previous player (3+ players)", () => {
    const state = fixture({
      playerCount: 3,
      hands: [[card("h2", "red", "9")], [card("r", "red", "reverse"), card("filler1", "red", "3")], []],
      currentSeat: 1,
    });
    const next = applyMove(state, move(1, { type: "play_card", cardId: "r" }));
    expect(next.direction).toBe(-1);
    expect(next.currentSeat).toBe(0);
  });

  it("reverse acts as a skip in a 2-player game", () => {
    const state = fixture({
      hands: [[card("r", "red", "reverse"), card("filler0", "red", "3")], fixture({}).hands[1]],
    });
    const next = applyMove(state, move(0, { type: "play_card", cardId: "r" }));
    expect(next.currentSeat).toBe(0);
  });

  it("draw2 makes the next player draw two cards and skips their turn", () => {
    const state = fixture({
      playerCount: 3,
      hands: [[card("d2", "red", "draw2"), card("filler0", "red", "3")], [], [card("h2", "red", "9")]],
    });
    const next = applyMove(state, move(0, { type: "play_card", cardId: "d2" }));
    expect(next.hands[1]).toHaveLength(2);
    expect(next.currentSeat).toBe(2);
  });

  it("wild4 sets the chosen color, forces a 4-card draw and skips the next player", () => {
    const state = fixture({
      playerCount: 3,
      hands: [[card("w4", "wild", "wild4"), card("filler0", "blue", "3")], [], [card("h2", "red", "9")]],
    });
    const next = applyMove(state, move(0, { type: "play_card", cardId: "w4", chosenColor: "blue" }));
    expect(next.currentColor).toBe("blue");
    expect(next.hands[1]).toHaveLength(4);
    expect(next.currentSeat).toBe(2);
  });

  it("draw_card gives one card and passes the turn", () => {
    const state = fixture({});
    const next = applyMove(state, move(0, { type: "draw_card" }));
    expect(next.hands[0]).toHaveLength(3);
    expect(next.currentSeat).toBe(1);
  });

  it("reshuffles the discard pile back into the deck when the deck runs out", () => {
    // Discard is oldest-first, so the LAST element is the current top card
    // (see topOfDiscard) — that's the one that must survive the reshuffle.
    const state = fixture({
      deck: [],
      discard: [card("old1", "blue", "1"), card("old2", "green", "2"), card("top", "red", "5")],
    });
    const next = applyMove(state, move(0, { type: "draw_card" }));
    expect(next.hands[0]).toHaveLength(3);
    expect(next.discard).toEqual([card("top", "red", "5")]);
    expect(next.deck).toHaveLength(1); // 2 shuffled in, 1 drawn
  });
});

describe("UNO call / challenge", () => {
  it("flags mustCallUnoSeat when a play brings a hand down to exactly one card", () => {
    const state = fixture({});
    const next = applyMove(state, move(0, { type: "play_card", cardId: "h0-a" }));
    expect(next.hands[0]).toHaveLength(1);
    expect(next.mustCallUnoSeat).toBe(0);
  });

  it("call_uno clears the flag for the exposed seat", () => {
    const state = fixture({ mustCallUnoSeat: 0, hands: [[card("only", "red", "1")], fixture({}).hands[1]] });
    const next = applyMove(state, move(0, { type: "call_uno" }));
    expect(next.mustCallUnoSeat).toBeNull();
  });

  it("rejects challenge_uno against a seat that isn't exposed", () => {
    const state = fixture({ mustCallUnoSeat: null });
    const result = validateMove(state, move(1, { type: "challenge_uno", targetSeat: 0 }));
    expect(result.valid).toBe(false);
  });

  it("challenge_uno penalizes the exposed seat with two cards and clears the flag", () => {
    const state = fixture({ mustCallUnoSeat: 0, hands: [[card("only", "red", "1")], fixture({}).hands[1]] });
    const next = applyMove(state, move(1, { type: "challenge_uno", targetSeat: 0 }));
    expect(next.hands[0]).toHaveLength(3);
    expect(next.mustCallUnoSeat).toBeNull();
  });
});

describe("victoria y puntaje", () => {
  it("finishes the match and sets the winner when a hand reaches zero cards", () => {
    const state = fixture({ hands: [[card("last", "red", "1")], fixture({}).hands[1]] });
    const next = applyMove(state, move(0, { type: "play_card", cardId: "last" }));

    expect(isFinished(next)).toBe(true);
    expect(next.winnerSeat).toBe(0);
    expect(getActiveSeat(next)).toBeNull();
  });

  it("scores the winner from the total value of opponents' remaining cards", () => {
    const finished = fixture({
      finished: true,
      winnerSeat: 0,
      hands: [
        [],
        [card("a", "blue", "5"), card("b", "green", "skip")], // 5 + 20 = 25
      ],
    });
    const result = calculateResult(finished);
    const winner = result.seatResults.find((r) => r.seat === 0)!;
    const loser = result.seatResults.find((r) => r.seat === 1)!;

    expect(winner.result).toBe("win");
    expect(winner.score).toBe(25);
    expect(winner.xpEarned).toBeGreaterThan(loser.xpEarned);
    expect(loser.result).toBe("loss");
  });
});
