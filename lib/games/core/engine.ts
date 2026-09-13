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

/** Lo mínimo que runMoveLoop/finishMatch necesitan del match — así
 * createMatch puede llamar al mismo loop sin tener que armar un MatchRow
 * completo (con id/created_at/etc. de una fila que en ese momento recién
 * se insertó). */
type LoopMatchContext = {
  room_id: string;
  game_match_players: Pick<MatchPlayerRow, "seat" | "profile_id" | "is_bot" | "bot_difficulty">[];
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

  // Quién arranca jugando la primera mano lo decide cada juego (en Truco,
  // por ejemplo, depende de la rotación del dealer, no de quién creó la
  // sala) — puede perfectamente ser un bot. Sin esto, si el asiento activo
  // inicial era de un bot, nadie se lo pedía nunca porque los bots solo
  // juegan en cadena como reacción al POST de un humano, y la partida
  // quedaba trabada desde el minuto cero.
  const loopMatch: LoopMatchContext = {
    room_id: roomId,
    game_match_players: players.map((p) => ({
      seat: p.seat,
      profile_id: p.profileId,
      is_bot: p.isBot,
      bot_difficulty: p.botDifficulty ?? null,
    })),
  };
  const openingResult = await runMoveLoop(supabase, match.id, loopMatch, game, initialState, null, 0, 0);
  if (!openingResult.ok) return { ok: false, error: openingResult.error };

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
 *
 * Recibe `profileId` (no un seat ya resuelto) para no depender de que quien
 * llama haya hecho su propia consulta aparte solo para ubicar el asiento —
 * antes el route handler hacía un SELECT propio antes de llamar acá, y esta
 * función volvía a traer la partida completa igual. Ahora hay un solo
 * SELECT de la partida: este resuelve el asiento con esos mismos datos.
 */
/** Un paso de la cadena resuelta por runMoveLoop: la vista resultante para
 * el asiento que mira, MÁS el movimiento que la produjo — así el cliente
 * puede anunciar qué pasó (quién cantó qué) en vez de solo pintar el
 * resultado final. */
export interface MoveStep {
  view: unknown;
  move: GameMove;
}

export async function applyPlayerMove(
  matchId: string,
  profileId: string,
  moveInput: { type: string; payload: unknown },
): Promise<EngineResult<{ finished: boolean; steps: MoveStep[] }>> {
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

  const seatRow = match.game_match_players.find((p) => p.profile_id === profileId);
  if (!seatRow) return { ok: false, error: "No participás de esta partida" };

  if (game.getActiveSeat(match.state) !== seatRow.seat) {
    return { ok: false, error: "No es tu turno" };
  }

  const move: GameMove = { seat: seatRow.seat, type: moveInput.type, payload: moveInput.payload };

  // Consulta aparte (chica, sin trucos de embedding) para el seq del
  // último evento — antes se embebía en el SELECT de arriba ordenando el
  // recurso anidado, pero esa combinación depende de una opción de
  // postgrest-js marcada deprecada (foreignTable/referencedTable) y no
  // vale el riesgo de que falle en el proyecto real por una diferencia de
  // versión: un round trip más es un costo ínfimo comparado con romper
  // el juego entero.
  const lastEvent = await supabase
    .from("game_events")
    .select("seq")
    .eq("match_id", matchId)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastSeq = lastEvent.data?.seq ?? -1;

  return runMoveLoop(supabase, matchId, match, game, match.state, move, seatRow.seat, lastSeq);
}

/**
 * Corre un movimiento humano (si hay uno: `firstMove`) y, en cadena, los de
 * cualquier bot cuyo turno siga inmediatamente — incluido el caso de
 * `firstMove: null`, que resuelve la cadena de bots empezando directamente
 * desde el asiento activo actual. Ese caso lo usa `createMatch`: la
 * primera mano de una partida nueva no necesariamente empieza en el
 * asiento humano (en Truco, por ejemplo, la mano #1 siempre arranca en el
 * asiento siguiente al dealer, que puede perfectamente ser un bot) — sin
 * este paso, si el que debía jugar primero era un bot, nadie se lo pedía
 * nunca y la partida quedaba trabada desde el minuto cero.
 *
 * Devuelve la vista del asiento que pidió el movimiento DESPUÉS DE CADA
 * PASO de la cadena (`steps`), no solo la final: si el motor resolvía en
 * el mismo pedido tu jugada y la de varios bots seguidos, la única vista
 * que llegaba a mostrarse era la del último bot — tu propia carta quedaba
 * tapada sin que la pantalla la mostrara ni una vez. El cliente anima
 * estos pasos en secuencia (lib/games/client.ts).
 *
 * Los eventos de cada paso se acumulan en memoria y se insertan en UN solo
 * viaje de red al final, en vez de uno por movimiento — con varios bots
 * seguidos eso significaba varios round trips extra a Supabase por cada
 * movimiento del jugador.
 */
async function runMoveLoop(
  supabase: AdminClient,
  matchId: string,
  match: LoopMatchContext,
  game: GameDefinition,
  initialState: unknown,
  firstMove: GameMove | null,
  viewerSeat: number,
  lastSeq: number,
): Promise<EngineResult<{ finished: boolean; steps: MoveStep[] }>> {
  // `state` is genuinely `unknown` here — GameDefinition's TState is opaque to
  // the generic engine, it only ever gets round-tripped through jsonb.
  let state: unknown = initialState;
  let seq = lastSeq;
  const events: Database["public"]["Tables"]["game_events"]["Insert"][] = [];
  const steps: MoveStep[] = [];

  const nextBotMove = (): GameMove | null => {
    const seat = game.getActiveSeat(state);
    const player = match.game_match_players.find((p) => p.seat === seat);
    return player?.is_bot && seat !== null ? game.getBotMove(state, seat, player.bot_difficulty ?? "normal") : null;
  };

  let pendingMove: GameMove | null = firstMove ?? nextBotMove();

  while (pendingMove) {
    const validation = game.validateMove(state, pendingMove);
    if (!validation.valid) return { ok: false, error: validation.reason };

    state = game.applyMove(state, pendingMove);
    seq += 1;
    steps.push({ view: game.toPlayerView(state, viewerSeat), move: pendingMove });

    const actingPlayer = match.game_match_players.find((p) => p.seat === pendingMove!.seat);
    events.push({
      match_id: matchId,
      profile_id: actingPlayer?.profile_id ?? null,
      seq,
      type: pendingMove.type,
      payload: pendingMove.payload as Record<string, unknown>,
    });

    if (game.isFinished(state)) {
      await Promise.all([supabase.from("game_events").insert(events), finishMatch(supabase, matchId, match, game, state)]);
      return { ok: true, data: { finished: true, steps } };
    }

    pendingMove = nextBotMove();
  }

  // Con firstMove: null, si el asiento activo ya era humano no hay nada
  // que resolver (events queda vacío) — no tiene sentido escribir nada.
  if (events.length > 0) {
    await Promise.all([
      supabase.from("game_events").insert(events),
      supabase.from("game_matches").update({ state: state as Record<string, unknown> }).eq("id", matchId),
    ]);
  }
  return { ok: true, data: { finished: false, steps } };
}

async function finishMatch(
  supabase: AdminClient,
  matchId: string,
  match: LoopMatchContext,
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
