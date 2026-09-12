import type { GameDefinition } from "@/lib/games/core/types";
import { getUnoBotMove } from "./bot";
import {
  applyMove,
  calculateResult,
  createInitialState,
  getActiveSeat,
  isFinished,
  toPlayerView,
  validateMove,
} from "./rules";
import type { UnoMovePayload, UnoState } from "./types";

export const unoGame: GameDefinition<UnoState, UnoMovePayload> = {
  slug: "uno",
  name: "UNO",
  gameType: "card",
  minPlayers: 2,
  maxPlayers: 6,
  supportsBots: true,
  createInitialState,
  validateMove,
  applyMove,
  isFinished,
  getActiveSeat,
  calculateResult,
  toPlayerView,
  getBotMove: getUnoBotMove,
};

export * from "./types";
