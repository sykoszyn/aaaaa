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
import type { TrucoCard, TrucoMovePayload, TrucoState } from "./types";

function card(suit: TrucoCard["suit"], value: TrucoCard["value"]): TrucoCard {
  return { id: `${suit}-${value}`, suit, value };
}

function fixture(overrides: Partial<TrucoState>): TrucoState {
  return {
    playerCount: 2,
    seed: "test-seed",
    rngCounter: 1,
    targetScore: 30,
    florEnabled: false,
    matchScore: [0, 0],
    finished: false,
    winnerTeam: null,
    handNumber: 1,
    dealerSeat: 1,
    manoSeat: 0,
    hands: [
      [card("oro", "4"), card("copa", "5"), card("basto", "6")],
      [card("espada", "4"), card("oro", "5"), card("copa", "6")],
    ],
    playedThisTrick: [null, null],
    trickNumber: 0,
    trickWinners: [],
    currentSeat: 0,
    envido: { calls: [], pending: null, resolved: false, winnerTeam: null, pointsAwarded: 0 },
    truco: { level: null, calledByTeam: null, pending: null },
    flor: { declaredSeats: [], resolved: false, winnerTeam: null, pointsAwarded: 0 },
    lastHandSummary: null,
    ...overrides,
  };
}

function move(seat: number, payload: TrucoMovePayload): GameMove<TrucoMovePayload> {
  return { seat, type: payload.type, payload };
}

describe("createInitialState", () => {
  it("deals 3 cards per player and is deterministic for the same seed", () => {
    const players = [
      { seat: 0, profileId: "p0", isBot: false },
      { seat: 1, profileId: "p1", isBot: false },
    ];
    const a = createInitialState({ players, settings: {}, seed: "match-seed" });
    const b = createInitialState({ players, settings: {}, seed: "match-seed" });

    expect(a.hands).toHaveLength(2);
    for (const hand of a.hands) expect(hand).toHaveLength(3);
    expect(a.targetScore).toBe(30);
    expect(a).toEqual(b);
  });

  it("reads targetScore and florEnabled from room settings", () => {
    const players = [
      { seat: 0, profileId: "p0", isBot: false },
      { seat: 1, profileId: "p1", isBot: false },
    ];
    const state = createInitialState({ players, settings: { targetScore: 15, florEnabled: true }, seed: "s" });
    expect(state.targetScore).toBe(15);
    expect(state.florEnabled).toBe(true);
  });

  it("supports 4 players in 2v2 teams", () => {
    const players = Array.from({ length: 4 }, (_, seat) => ({ seat, profileId: `p${seat}`, isBot: false }));
    const state = createInitialState({ players, settings: {}, seed: "s4" });
    expect(state.hands).toHaveLength(4);
  });
});

describe("bazas: resolución y desempate", () => {
  it("the higher card wins the trick outright", () => {
    const state = fixture({
      hands: [[card("espada", "1"), card("oro", "4"), card("copa", "5")], [card("basto", "4"), card("oro", "5"), card("copa", "6")]],
    });
    const afterA = applyMove(state, move(0, { type: "play_card", cardId: "espada-1" }));
    const afterB = applyMove(afterA, move(1, { type: "play_card", cardId: "basto-4" }));
    expect(afterB.trickWinners).toEqual([0]);
    expect(afterB.currentSeat).toBe(0); // el ganador de la baza abre la próxima
  });

  it("marks a trick as parda when the top card is tied across teams", () => {
    const state = fixture({
      hands: [[card("oro", "4"), card("copa", "5"), card("basto", "6")], [card("espada", "4"), card("oro", "5"), card("copa", "6")]],
    });
    const afterA = applyMove(state, move(0, { type: "play_card", cardId: "oro-4" }));
    const afterB = applyMove(afterA, move(1, { type: "play_card", cardId: "espada-4" }));
    expect(afterB.trickWinners).toEqual(["parda"]);
  });

  it("ends the hand when the same team wins two tricks in a row", () => {
    let state = fixture({ trickWinners: [0] as TrucoState["trickWinners"], trickNumber: 1, currentSeat: 0 });
    state = applyMove(state, move(0, { type: "play_card", cardId: "basto-6" }));
    state = applyMove(state, move(1, { type: "play_card", cardId: "oro-5" })); // 6 > 5, seat0 wins again
    // La mano termina acá mismo (2 bazas seguidas) y se reparte una nueva,
    // por eso trickWinners ya no muestra la mano recién jugada.
    expect(state.lastHandSummary?.truco).toEqual({ team: 0, points: 1, reason: "tricks" });
    expect(state.handNumber).toBe(2); // dealt a new hand automatically
  });

  it("awards the hand to whoever won the first trick when the second is parda", () => {
    let state = fixture({
      trickWinners: [1] as TrucoState["trickWinners"],
      trickNumber: 1,
      currentSeat: 0,
      hands: [[card("oro", "4")], [card("espada", "4")]],
      playedThisTrick: [null, null],
    });
    state = applyMove(state, move(0, { type: "play_card", cardId: "oro-4" }));
    state = applyMove(state, move(1, { type: "play_card", cardId: "espada-4" }));
    expect(state.lastHandSummary?.truco?.team).toBe(1);
  });

  it("plays a third trick when the first two are split between teams, mano breaking a final parda", () => {
    let state = fixture({
      trickWinners: [0, 1] as TrucoState["trickWinners"],
      trickNumber: 2,
      currentSeat: 0,
      manoSeat: 0,
      hands: [[card("oro", "4")], [card("espada", "4")]],
      playedThisTrick: [null, null],
    });
    state = applyMove(state, move(0, { type: "play_card", cardId: "oro-4" }));
    state = applyMove(state, move(1, { type: "play_card", cardId: "espada-4" }));
    // tercera parda -> gana quien ganó la primera (equipo 0)
    expect(state.lastHandSummary?.truco?.team).toBe(0);
  });

  it("mano's team wins when all three tricks are parda", () => {
    let state = fixture({
      trickWinners: ["parda", "parda"] as TrucoState["trickWinners"],
      trickNumber: 2,
      currentSeat: 0,
      manoSeat: 1,
      hands: [[card("oro", "4")], [card("espada", "4")]],
      playedThisTrick: [null, null],
    });
    state = applyMove(state, move(0, { type: "play_card", cardId: "oro-4" }));
    state = applyMove(state, move(1, { type: "play_card", cardId: "espada-4" }));
    expect(state.lastHandSummary?.truco?.team).toBe(1);
  });
});

describe("envido: legalidad y escalada", () => {
  it("rejects calling envido out of turn", () => {
    const state = fixture({ currentSeat: 0 });
    expect(validateMove(state, move(1, { type: "call_envido", level: "envido" })).valid).toBe(false);
  });

  it("rejects calling envido once the first trick is over", () => {
    const state = fixture({ trickNumber: 1 });
    expect(validateMove(state, move(0, { type: "call_envido", level: "envido" })).valid).toBe(false);
  });

  it("allows envido-envido but not a third plain envido, requiring real_envido or falta_envido instead", () => {
    const state = fixture({
      envido: { calls: ["envido", "envido"], pending: null, resolved: false, winnerTeam: null, pointsAwarded: 0 },
    });
    expect(validateMove(state, move(0, { type: "call_envido", level: "envido" })).valid).toBe(false);
    expect(validateMove(state, move(0, { type: "call_envido", level: "real_envido" })).valid).toBe(true);
  });

  it("blocks a new truco call while envido is pending, and vice versa", () => {
    const withEnvidoPending = fixture({ envido: { calls: [], pending: { level: "envido", calledByTeam: 0 }, resolved: false, winnerTeam: null, pointsAwarded: 0 } });
    expect(validateMove(withEnvidoPending, move(1, { type: "call_truco", level: "truco" })).valid).toBe(false);

    const withTrucoPending = fixture({ truco: { level: null, calledByTeam: null, pending: { level: "truco", calledByTeam: 0 } } });
    expect(validateMove(withTrucoPending, move(0, { type: "call_envido", level: "envido" })).valid).toBe(false);
  });

  it("awards points to the winner of the envido comparison when accepted", () => {
    const state = fixture({
      hands: [[card("oro", "7"), card("oro", "5"), card("basto", "2")], [card("copa", "1"), card("espada", "3"), card("basto", "10")]],
      envido: { calls: [], pending: { level: "envido", calledByTeam: 0 }, resolved: false, winnerTeam: null, pointsAwarded: 0 },
    });
    // seat0: oro 7+5 = 32. seat1: no pair -> best single card copa-1 = 1.
    const next = applyMove(state, move(1, { type: "respond_bid", accept: true }));
    expect(next.envido.winnerTeam).toBe(0);
    expect(next.envido.pointsAwarded).toBe(2);
    expect(next.matchScore[0]).toBe(2);
  });

  it("awards the decline value to the caller when the rival says no quiero", () => {
    const state = fixture({
      envido: { calls: ["envido"], pending: { level: "envido", calledByTeam: 0 }, resolved: false, winnerTeam: null, pointsAwarded: 0 },
    });
    const next = applyMove(state, move(1, { type: "respond_bid", accept: false }));
    expect(next.envido.pointsAwarded).toBe(2); // ["envido","envido"] declined = 2
    expect(next.matchScore[0]).toBe(2);
    expect(next.envido.resolved).toBe(true);
  });

  it("falta_envido awards exactly the points needed to reach the target score", () => {
    const state = fixture({
      targetScore: 30,
      matchScore: [25, 10],
      hands: [[card("oro", "7"), card("oro", "5"), card("basto", "2")], [card("copa", "1"), card("espada", "3"), card("basto", "10")]],
      envido: { calls: [], pending: { level: "falta_envido", calledByTeam: 0 }, resolved: false, winnerTeam: null, pointsAwarded: 0 },
    });
    const next = applyMove(state, move(1, { type: "respond_bid", accept: true }));
    expect(next.envido.winnerTeam).toBe(0);
    expect(next.matchScore[0]).toBe(30);
    expect(next.finished).toBe(true);
    expect(next.winnerTeam).toBe(0);
  });
});

describe("truco: escalada y puntos", () => {
  it("only the team that didn't call last may raise", () => {
    const state = fixture({ truco: { level: "truco", calledByTeam: 0, pending: null }, currentSeat: 0 });
    expect(validateMove(state, move(0, { type: "call_truco", level: "retruco" })).valid).toBe(false);
    expect(validateMove({ ...state, currentSeat: 1 }, move(1, { type: "call_truco", level: "retruco" })).valid).toBe(true);
  });

  it("rejects skipping a level (truco straight to vale_cuatro)", () => {
    const state = fixture({ truco: { level: "truco", calledByTeam: 0, pending: null } });
    expect(validateMove(state, move(1, { type: "call_truco", level: "vale_cuatro" })).valid).toBe(false);
  });

  it("accepting truco just raises the accepted level without ending the hand", () => {
    const state = fixture({ truco: { level: null, calledByTeam: null, pending: { level: "truco", calledByTeam: 0 } } });
    const next = applyMove(state, move(1, { type: "respond_bid", accept: true }));
    expect(next.truco.level).toBe("truco");
    expect(next.truco.calledByTeam).toBe(0);
    expect(next.finished).toBe(false);
  });

  it("declining truco ends the hand, awarding the previous level's value to whoever called the raise", () => {
    const state = fixture({ truco: { level: "truco", calledByTeam: 0, pending: { level: "retruco", calledByTeam: 1 } } });
    const next = applyMove(state, move(0, { type: "respond_bid", accept: false }));
    expect(next.lastHandSummary?.truco).toEqual({ team: 1, points: 2, reason: "no_quiero" });
    expect(next.matchScore[1]).toBe(2);
  });
});

describe("irse al mazo", () => {
  it("ends the hand immediately and awards the current truco value to the other team", () => {
    const state = fixture({ truco: { level: "retruco", calledByTeam: 0, pending: null } });
    const next = applyMove(state, move(0, { type: "go_to_deck" }));
    expect(next.lastHandSummary?.truco).toEqual({ team: 1, points: 3, reason: "fold" });
    expect(next.matchScore[1]).toBe(3);
  });

  it("awards 1 point (no truco called) when folding before any truco bet", () => {
    const state = fixture({});
    const next = applyMove(state, move(1, { type: "go_to_deck" }));
    expect(next.matchScore[0]).toBe(1);
  });
});

describe("flor", () => {
  it("rejects declaring flor without three cards of the same suit", () => {
    const state = fixture({ florEnabled: true });
    expect(validateMove(state, move(0, { type: "declare_flor" })).valid).toBe(false);
  });

  it("blocks envido once a flor was declared", () => {
    const state = fixture({
      florEnabled: true,
      hands: [[card("oro", "1"), card("oro", "4"), card("oro", "7")], fixture({}).hands[1]],
      flor: { declaredSeats: [0], resolved: false, winnerTeam: null, pointsAwarded: 0 },
    });
    expect(validateMove(state, move(1, { type: "call_envido", level: "envido" })).valid).toBe(false);
  });

  it("awards 3 points to the best flor once the first trick closes", () => {
    const state = fixture({
      florEnabled: true,
      hands: [[card("oro", "1"), card("oro", "4"), card("oro", "7")], [card("espada", "6"), card("copa", "5"), card("basto", "2")]],
      flor: { declaredSeats: [0], resolved: false, winnerTeam: null, pointsAwarded: 0 },
    });
    const afterA = applyMove(state, move(0, { type: "play_card", cardId: "oro-7" }));
    const afterB = applyMove(afterA, move(1, { type: "play_card", cardId: "espada-6" }));
    expect(afterB.flor.winnerTeam).toBe(0);
    expect(afterB.matchScore[0]).toBe(3);
  });
});

describe("fin de partida", () => {
  it("finishes the match once a team reaches the target score via tricks", () => {
    const state = fixture({ matchScore: [29, 10], trickWinners: [0] as TrucoState["trickWinners"], trickNumber: 1, currentSeat: 0 });
    const afterA = applyMove(state, move(0, { type: "play_card", cardId: "basto-6" }));
    const afterB = applyMove(afterA, move(1, { type: "play_card", cardId: "oro-5" }));
    expect(afterB.finished).toBe(true);
    expect(afterB.winnerTeam).toBe(0);
    expect(getActiveSeat(afterB)).toBeNull();

    const result = calculateResult(afterB);
    expect(result.seatResults.find((r) => r.seat === 0)?.result).toBe("win");
    expect(result.seatResults.find((r) => r.seat === 1)?.result).toBe("loss");
  });
});

describe("getActiveSeat: equipos", () => {
  it("points to a seat on the responding team when a bid is pending", () => {
    const state = fixture({ envido: { calls: [], pending: { level: "envido", calledByTeam: 0 }, resolved: false, winnerTeam: null, pointsAwarded: 0 } });
    expect(getActiveSeat(state)).toBe(1);
  });

  it("assigns seats 0/2 to team 0 and 1/3 to team 1 in a 4-player match", () => {
    const players = Array.from({ length: 4 }, (_, seat) => ({ seat, profileId: `p${seat}`, isBot: false }));
    const state = createInitialState({ players, settings: {}, seed: "team-check" });
    expect(isFinished(state)).toBe(false);
    // El equipo 0 (asientos 0 y 2) responde cuando cantó el equipo 1.
    const withPending: TrucoState = {
      ...state,
      envido: { calls: [], pending: { level: "envido", calledByTeam: 1 }, resolved: false, winnerTeam: null, pointsAwarded: 0 },
    };
    expect(getActiveSeat(withPending)).toBe(0);
  });
});
