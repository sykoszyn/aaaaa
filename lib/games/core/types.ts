import type { GameSlug, GameType } from "@/types/database";

export type BotDifficulty = "easy" | "normal" | "hard";

/** A seat at the table — either a human player or a bot. */
export interface GamePlayerRef {
  seat: number;
  profileId: string | null;
  isBot: boolean;
  botDifficulty?: BotDifficulty;
}

/**
 * Everything a GameDefinition needs to produce a deterministic initial
 * state. Kept separate from GamePlayerRef so game setup can read room
 * settings (e.g. Truco "a 15 o 30 puntos", Ludo board variant) without the
 * engine needing to know about them.
 */
export interface GameSetupContext {
  players: GamePlayerRef[];
  settings: Record<string, unknown>;
  /** Deterministic seed for shuffles/dice — persisted so a reconnect or a
   * server restart can't change what's already been decided. */
  seed: string;
}

/** Outcome for a single seat once a match finishes. */
export interface SeatResult {
  seat: number;
  result: "win" | "loss" | "draw" | "abandoned";
  score: number;
  xpEarned: number;
}

export interface MatchResult {
  seatResults: SeatResult[];
  /** Free-form summary a game can attach for the match history UI, e.g.
   * { winningTeam: 1, handsPlayed: 6 } — never used for anything the
   * server relies on, purely presentational. */
  summary?: Record<string, unknown>;
}

/**
 * A requested action from a client. `type` is game-specific ("play_card",
 * "roll_dice", "shoot"); `payload` is validated by the game's own
 * `validateMove` before anything is applied — the engine never trusts it.
 */
export interface GameMove<TPayload = unknown> {
  seat: number;
  type: string;
  payload: TPayload;
}

export type MoveValidation = { valid: true } | { valid: false; reason: string };

/**
 * The contract every game module implements. `TState` must be JSON-
 * serializable (it's stored as-is in `game_matches.state` jsonb) and must
 * never hold anything the requesting player shouldn't see for OTHER
 * players — see `toPlayerView` for how we hide, e.g., opponents' hands.
 */
export interface GameDefinition<TState = unknown, TMovePayload = unknown> {
  slug: GameSlug;
  name: string;
  gameType: GameType;
  minPlayers: number;
  maxPlayers: number;
  supportsBots: boolean;

  /** Builds the deterministic initial state for a fresh match. */
  createInitialState(ctx: GameSetupContext): TState;

  /** Server-side authority: is this move legal in the current state? */
  validateMove(state: TState, move: GameMove<TMovePayload>): MoveValidation;

  /** Pure reducer: (state, legal move) -> next state. Never called with a
   * move that failed validateMove. */
  applyMove(state: TState, move: GameMove<TMovePayload>): TState;

  /** Whose turn it is, or null if nobody needs to act (e.g. mid-animation
   * states some games may model). Lets the generic engine know when to
   * automatically run a bot's move after a human plays. */
  getActiveSeat(state: TState): number | null;

  /** True once the match has reached a terminal condition. */
  isFinished(state: TState): boolean;

  /** Only called when isFinished(state) is true. */
  calculateResult(state: TState): MatchResult;

  /** Strips information the given seat isn't allowed to see (opponents'
   * hands, face-down cards, undrawn deck order) before the state is sent
   * to that player's client. Identity function for games with no hidden
   * information (Ludo, Bowling, Pool). */
  toPlayerView(state: TState, seat: number): unknown;

  /** Picks a move for a bot seat. Runs server-side, synchronously, no
   * external calls — see lib/games/core/bot.ts. */
  getBotMove(state: TState, seat: number, difficulty: BotDifficulty): GameMove<TMovePayload>;
}
