export type TrucoSuit = "oro" | "copa" | "espada" | "basto";
export type TrucoValue = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "10" | "11" | "12";

export interface TrucoCard {
  id: string;
  suit: TrucoSuit;
  value: TrucoValue;
}

/** 0 o 1 — con 2 jugadores cada equipo es un solo asiento; con 4, los
 * asientos pares son el equipo 0 y los impares el equipo 1 (compañeros
 * sentados "cruzados", como en una mesa real: 0 y 2 vs 1 y 3). */
export type TrucoTeam = 0 | 1;

export type EnvidoLevel = "envido" | "real_envido" | "falta_envido";
export type TrucoBetLevel = "truco" | "retruco" | "vale_cuatro";

export type TrucoMovePayload =
  | { type: "play_card"; cardId: string }
  | { type: "call_envido"; level: EnvidoLevel }
  | { type: "call_truco"; level: TrucoBetLevel }
  | { type: "respond_bid"; accept: boolean }
  | { type: "declare_flor" }
  | { type: "go_to_deck" };

export interface EnvidoBidState {
  /** Secuencia de cantos de esta mano, ej. ["envido","envido"] (envido iban
   * envido) o ["envido","real_envido"]. Vacío = todavía no se cantó. */
  calls: EnvidoLevel[];
  pending: { level: EnvidoLevel; calledByTeam: TrucoTeam } | null;
  /** true una vez resuelto (aceptado-y-comparado, o rechazado) — a partir
   * de ahí no se puede volver a cantar envido en esta mano. */
  resolved: boolean;
  winnerTeam: TrucoTeam | null;
  pointsAwarded: number;
}

export interface TrucoBetState {
  level: TrucoBetLevel | null;
  calledByTeam: TrucoTeam | null;
  pending: { level: TrucoBetLevel; calledByTeam: TrucoTeam } | null;
}

export interface FlorState {
  declaredSeats: number[];
  resolved: boolean;
  winnerTeam: TrucoTeam | null;
  pointsAwarded: number;
}

export type HandEndReason = "tricks" | "fold" | "no_quiero";

export interface HandSummary {
  handNumber: number;
  envido: { team: TrucoTeam; points: number } | null;
  flor: { team: TrucoTeam; points: number } | null;
  truco: { team: TrucoTeam; points: number; reason: HandEndReason } | null;
}

export interface TrucoState {
  playerCount: 2 | 4;
  seed: string;
  rngCounter: number;
  targetScore: number;
  florEnabled: boolean;

  matchScore: [number, number];
  finished: boolean;
  winnerTeam: TrucoTeam | null;

  handNumber: number;
  dealerSeat: number;
  /** El jugador "mano" (siguiente al dealer) juega primero y desempata pardas. */
  manoSeat: number;
  hands: TrucoCard[][];
  playedThisTrick: (TrucoCard | null)[];
  trickNumber: number;
  trickWinners: (TrucoTeam | "parda")[];
  currentSeat: number;

  envido: EnvidoBidState;
  truco: TrucoBetState;
  flor: FlorState;

  lastHandSummary: HandSummary | null;
}

export interface TrucoPlayerView {
  self: { seat: number; hand: TrucoCard[] };
  playerCount: 2 | 4;
  matchScore: [number, number];
  myTeam: TrucoTeam;
  playedThisTrick: (TrucoCard | null)[];
  trickNumber: number;
  trickWinners: (TrucoTeam | "parda")[];
  currentSeat: number;
  manoSeat: number;
  opponentCardCounts: { seat: number; cardCount: number }[];
  envido: EnvidoBidState;
  truco: TrucoBetState;
  flor: FlorState;
  handNumber: number;
  finished: boolean;
  winnerTeam: TrucoTeam | null;
  targetScore: number;
  lastHandSummary: HandSummary | null;
}
