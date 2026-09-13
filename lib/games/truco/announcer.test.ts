import { describe, expect, it } from "vitest";
import { describeTrucoStep } from "./announcer";
import type { TrucoPlayerView } from "./types";

function view(overrides: Partial<TrucoPlayerView>): TrucoPlayerView {
  return {
    self: { seat: 0, hand: [] },
    playerCount: 2,
    matchScore: [0, 0],
    myTeam: 0,
    playedThisTrick: [null, null],
    trickNumber: 0,
    trickWinners: [],
    currentSeat: 0,
    manoSeat: 0,
    opponentCardCounts: [{ seat: 1, cardCount: 3 }],
    envido: { calls: [], pending: null, resolved: false, winnerTeam: null, pointsAwarded: 0 },
    truco: { level: null, calledByTeam: null, pending: null },
    flor: { declaredSeats: [], resolved: false, winnerTeam: null, pointsAwarded: 0 },
    handNumber: 1,
    finished: false,
    winnerTeam: null,
    targetScore: 30,
    lastHandSummary: null,
    ...overrides,
  };
}

describe("describeTrucoStep", () => {
  it("anuncia un canto de envido del rival", () => {
    const prev = view({});
    const next = view({ envido: { calls: ["envido"], pending: { level: "envido", calledByTeam: 1 }, resolved: false, winnerTeam: null, pointsAwarded: 0 } });
    const phrases = describeTrucoStep({ seat: 1, type: "call_envido", payload: { type: "call_envido", level: "envido" } }, prev, next);
    expect(phrases).toEqual(["¡Envido!"]);
  });

  it("anuncia quiero + el resultado del envido en el mismo paso", () => {
    const prev = view({ envido: { calls: ["envido"], pending: { level: "envido", calledByTeam: 1 }, resolved: false, winnerTeam: null, pointsAwarded: 0 } });
    const next = view({ envido: { calls: ["envido"], pending: null, resolved: true, winnerTeam: 0, pointsAwarded: 2 } });
    const phrases = describeTrucoStep({ seat: 0, type: "respond_bid", payload: { type: "respond_bid", accept: true } }, prev, next);
    expect(phrases).toEqual(["¡Quiero!", "Ganamos el envido, 2 puntos"]);
  });

  it("no repite el resultado del envido en un paso donde ya estaba resuelto", () => {
    const resolved = view({ envido: { calls: ["envido"], pending: null, resolved: true, winnerTeam: 0, pointsAwarded: 2 } });
    const phrases = describeTrucoStep({ seat: 1, type: "play_card", payload: { type: "play_card", cardId: "oro-4" } }, resolved, resolved);
    expect(phrases).toEqual([]);
  });

  it("anuncia quién se lleva la mano cuando cambia lastHandSummary", () => {
    const prev = view({});
    const next = view({
      lastHandSummary: { handNumber: 1, envido: null, flor: null, truco: { team: 1, points: 1, reason: "tricks" } },
    });
    const phrases = describeTrucoStep({ seat: 1, type: "play_card", payload: { type: "play_card", cardId: "oro-4" } }, prev, next);
    expect(phrases).toEqual(["Se llevan la mano, 1 puntos"]);
  });

  it("anuncia el resultado final de la partida", () => {
    const prev = view({});
    const next = view({ finished: true, winnerTeam: 0 });
    const phrases = describeTrucoStep({ seat: 0, type: "play_card", payload: { type: "play_card", cardId: "oro-4" } }, prev, next);
    expect(phrases).toEqual(["¡Ganamos la partida!"]);
  });
});
