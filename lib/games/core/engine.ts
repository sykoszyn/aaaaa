import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
// Barrel import (not "./registry" directly) so this module's own bundle
// always registers every game — see lib/games/index.ts.
import { getGameDefinition } from "@/lib/games";
import type { Database, GameSlug } from "@/types/database";
import type { BotDifficulty, GameDefinition, GameMove, GamePlayerRef } from "./types";

type EngineResult<T> = { ok: true; data: T } | { ok: false; error: string };

type AdminClient = ReturnType<typeof createAdminClient>;
type MatchPlayerRow = Database["public"]["Tables"]["game_match_players"]["Row"];
type MatchRow = Database["public"]["Tables"]["game_matches"]["Row"] & {
  games: { slug: GameSlug };
  game_match_players: MatchPlayerRow[];
};

/**
 * Every function here runs ONLY on the server (route handlers / server
 * actions) using the service-role client, because game_matches /
 * game_match_players / game_events have no client-writable RLS policies —
 * this module is the single place that's allowed to write match state.
 * A client never sends a "new state", only a `GameMove`; everything below
 * re-derives the next state from the move against the last persisted one.
 */

/** FASE 1: sala -> partida. Crea el match, los match_players y el primer evento. */
export async function createMatch(roomId: string): Promise<EngineResult<{ matchId: string }>> {
  const supabase = createAdminClient();

  const { data: room, error: roomError } = await supabase
    .from("game_rooms")
    .select("*, games(*), game_room_players(*)")
    .eq("id", roomId)
    .single();

  if (roomError || !room) return { ok: false, error: "Sala no encontrada" };

  const game = getGameDefinition(room.games.slug as GameSlug);
  if (!game) return { ok: false, error: `El juego "${room.games.slug}" todavía no está implementado` };

  const roomPlayers = room.game_room_players as Array<{
    profile_id: string | null;
    is_bot: boolean;
    bot_difficulty: BotDifficulty | null;
    seat: number;
  }>;

  if (roomPlayers.length < game.minPlayers) {
    return { ok: false, error: `${game.name} necesita al menos ${game.minPlayers} jugadores` };
  }

  const players: GamePlayerRef[] = roomPlayers.map((p) => ({
    seat: p.seat,
    profileId: p.profile_id,
    isBot: p.is_bot,
    botDifficulty: p.bot_difficulty ?? undefined,
  }));

  const seed = crypto.randomUUID();
  let initialState: unknown;
  try {
    // createInitialState puede rechazar la cantidad de jugadores (ej. Truco
    // exige 2 o 4, no 3) — es una validación legítima del juego, no un bug,
    // así que se captura acá en vez de dejar que reviente como un 500.
    initialState = game.createInitialState({ players, settings: room.settings, seed });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo iniciar la partida" };
  }

  const { data: match, error: matchError } = await supabase
    .from("game_matches")
    .insert({
      room_id: roomId,
      game_id: room.game_id,
      status: "in_progress",
      // GameDefinition.createInitialState() is contractually JSON-serializable
      // (see lib/games/core/types.ts) but its generic TState is unknown here.
      state: initialState as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (matchError || !match) return { ok: false, error: "No se pudo crear la partida" };

  const { error: playersError } = await supabase.from("game_match_players").insert(
    players.map((p) => ({
      match_id: match.id,
      profile_id: p.profileId,
      is_bot: p.isBot,
      bot_difficulty: p.botDifficulty ?? null,
      seat: p.seat,
    })),
  );

  if (playersError) return { ok: false, error: "No se pudo registrar a los jugadores de la partida" };

  await supabase.from("game_events").insert({
    match_id: match.id,
    seq: 0,
    type: "match_started",
    payload: { seed },
  });

  await supabase.from("game_rooms").update({ status: "in_progress" }).eq("id", roomId);

  return { ok: true, data: { matchId: match.id } };
}

/** Devuelve el estado tal como debe verlo `seat` (oculta info de otros jugadores). */
export async function getStateForSeat(matchId: string, seat: number | null): Promise<EngineResult<unknown>> {
  const supabase = createAdminClient();
  const { data: match, error } = await supabase
    .from("game_matches")
    .select("*, games(slug)")
    .eq("id", matchId)
    .single();

  if (error || !match) return { ok: false, error: "Partida no encontrada" };

  const game = getGameDefinition(match.games.slug as GameSlug);
  if (!game) return { ok: false, error: "Juego no implementado" };

  const view = seat === null ? match.state : game.toPlayerView(match.state, seat);
  return { ok: true, data: view };
}

/**
 * Aplica un movimiento solicitado por un jugador. Valida, aplica, persiste
 * el evento y el nuevo estado, cierra la partida si terminó, y — si el
 * turno siguiente es de un bot — resuelve automáticamente sus movimientos
 * en cadena hasta que vuelva a ser el turno de un humano o termine el juego.
 */
export async function applyPlayerMove(
  matchId: string,
  requestingSeat: number,
  move: GameMove,
): Promise<EngineResult<{ finished: boolean }>> {
  const supabase = createAdminClient();

  const { data: match, error } = await supabase
    .from("game_matches")
    .select("*, games(slug), game_match_players(*)")
    .eq("id", matchId)
    .single();

  if (error || !match) return { ok: false, error: "Partida no encontrada" };
  if (match.status !== "in_progress") return { ok: false, error: "La partida ya terminó" };

  const game = getGameDefinition(match.games.slug as GameSlug);
  if (!game) return { ok: false, error: "Juego no implementado" };

  if (game.getActiveSeat(match.state) !== requestingSeat) {
    return { ok: false, error: "No es tu turno" };
  }
  if (move.seat !== requestingSeat) {
    return { ok: false, error: "El movimiento no coincide con tu asiento" };
  }

  return runMoveLoop(supabase, matchId, match, game, move);
}

/**
 * Corre el movimiento del humano y, en cadena, los de cualquier bot cuyo
 * turno siga inmediatamente, persistiendo cada paso como su propio evento.
 */
async function runMoveLoop(
  supabase: AdminClient,
  matchId: string,
  match: MatchRow,
  game: GameDefinition,
  firstMove: GameMove,
): Promise<EngineResult<{ finished: boolean }>> {
  // `state` is genuinely `unknown` here — GameDefinition's TState is opaque to
  // the generic engine, it only ever gets round-tripped through jsonb.
  let state: unknown = match.state;
  const lastEvent = await supabase
    .from("game_events")
    .select("seq")
    .eq("match_id", matchId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  let seq = lastEvent.data?.seq ?? -1;

  let pendingMove: GameMove | null = firstMove;

  while (pendingMove) {
    const validation = game.validateMove(state, pendingMove);
    if (!validation.valid) return { ok: false, error: validation.reason };

    state = game.applyMove(state, pendingMove);
    seq += 1;

    const actingPlayer = match.game_match_players.find((p) => p.seat === pendingMove!.seat);
    await supabase.from("game_events").insert({
      match_id: matchId,
      profile_id: actingPlayer?.profile_id ?? null,
      seq,
      type: pendingMove.type,
      payload: pendingMove.payload as Record<string, unknown>,
    });

    if (game.isFinished(state)) {
      await finishMatch(supabase, matchId, match, game, state);
      return { ok: true, data: { finished: true } };
    }

    const nextSeat = game.getActiveSeat(state);
    const nextPlayer = match.game_match_players.find((p) => p.seat === nextSeat);

    pendingMove =
      nextPlayer?.is_bot && nextSeat !== null
        ? game.getBotMove(state, nextSeat, nextPlayer.bot_difficulty ?? "normal")
        : null;
  }

  await supabase.from("game_matches").update({ state: state as Record<string, unknown> }).eq("id", matchId);
  return { ok: true, data: { finished: false } };
}

async function finishMatch(
  supabase: AdminClient,
  matchId: string,
  match: MatchRow,
  game: GameDefinition,
  finalState: unknown,
) {
  const result = game.calculateResult(finalState);

  await Promise.all(
    result.seatResults.map((sr) =>
      supabase
        .from("game_match_players")
        .update({ result: sr.result, score: sr.score, xp_earned: sr.xpEarned })
        .eq("match_id", matchId)
        .eq("seat", sr.seat),
    ),
  );

  // Updating status to 'finished' fires apply_match_result() in Postgres,
  // which updates player_stats / profiles / leaderboards atomically.
  await supabase
    .from("game_matches")
    .update({
      state: finalState as Record<string, unknown>,
      status: "finished",
      result: result.summary ?? {},
      finished_at: new Date().toISOString(),
    })
    .eq("id", matchId);

  await supabase.from("game_rooms").update({ status: "finished" }).eq("id", match.room_id);
}
