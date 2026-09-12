import type { GameDefinition } from "@/lib/games/core/types";
import { getTrucoBotMove } from "./bot";
import {
  applyMove,
  calculateResult,
  createInitialState,
  getActiveSeat,
  isFinished,
  toPlayerView,
  validateMove,
} from "./rules";
import type { TrucoMovePayload, TrucoState } from "./types";

export const trucoGame: GameDefinition<TrucoState, TrucoMovePayload> = {
  slug: "truco",
  name: "Truco Argentino",
  gameType: "card",
  minPlayers: 2,
  maxPlayers: 4,
  supportsBots: true,
  createInitialState,
  validateMove,
  applyMove,
  isFinished,
  getActiveSeat,
  calculateResult,
  toPlayerView,
  getBotMove: getTrucoBotMove,
};

export * from "./types";
