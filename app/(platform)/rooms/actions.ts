"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createMatch } from "@/lib/games/core/engine";
import { isGameImplemented } from "@/lib/games";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { BotDifficulty, GameSlug } from "@/types/database";

export type RoomActionState = { error?: string } | null;

const createRoomSchema = z.object({
  gameSlug: z.enum(["uno", "truco", "pool", "bowling", "ludo"]),
  visibility: z.enum(["public", "private"]),
  maxPlayers: z.coerce.number().int().min(1).max(8),
  allowBots: z.coerce.boolean(),
});

export async function createRoom(_prev: RoomActionState, formData: FormData): Promise<RoomActionState> {
  const parsed = createRoomSchema.safeParse({
    gameSlug: formData.get("gameSlug"),
    visibility: formData.get("visibility") ?? "public",
    maxPlayers: formData.get("maxPlayers"),
    allowBots: formData.get("allowBots") === "on",
  });

  if (!parsed.success) return { error: "Datos de sala inválidos" };

  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, min_players, max_players")
    .eq("slug", parsed.data.gameSlug)
    .single();

  if (gameError || !game) return { error: "Juego no encontrado" };

  const maxPlayers = Math.min(Math.max(parsed.data.maxPlayers, game.min_players), game.max_players);

  const { data: room, error: roomError } = await supabase
    .from("game_rooms")
    .insert({
      game_id: game.id,
      host_id: profile.id,
      visibility: parsed.data.visibility,
      max_players: maxPlayers,
      allow_bots: parsed.data.allowBots,
    })
    .select("id")
    .single();

  if (roomError || !room) return { error: "No se pudo crear la sala" };

  const { error: joinError } = await supabase
    .from("game_room_players")
    .insert({ room_id: room.id, profile_id: profile.id, seat: 0, is_ready: true });

  if (joinError) return { error: "No se pudo unirte a tu propia sala" };

  redirect(`/rooms/${room.id}`);
}

async function nextFreeSeat(roomId: string): Promise<number> {
  const supabase = await createClient();
  const { data: players } = await supabase.from("game_room_players").select("seat").eq("room_id", roomId);
  const taken = new Set((players ?? []).map((p) => p.seat));
  let seat = 0;
  while (taken.has(seat)) seat++;
  return seat;
}

async function joinRoom(roomId: string): Promise<RoomActionState> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: room, error: roomError } = await supabase
    .from("game_rooms")
    .select("id, status, max_players, game_room_players(count)")
    .eq("id", roomId)
    .single();

  if (roomError || !room) return { error: "Sala no encontrada" };
  if (room.status !== "waiting") return { error: "La partida ya empezó" };

  const currentCount = (room.game_room_players as unknown as { count: number }[])[0]?.count ?? 0;
  if (currentCount >= room.max_players) return { error: "La sala está llena" };

  const seat = await nextFreeSeat(roomId);
  const { error: joinError } = await supabase
    .from("game_room_players")
    .insert({ room_id: roomId, profile_id: profile.id, seat });

  if (joinError) return { error: "Ya estás en esta sala" };

  revalidatePath(`/rooms/${roomId}`);
  redirect(`/rooms/${roomId}`);
}

export async function joinRoomByCode(_prev: RoomActionState, formData: FormData): Promise<RoomActionState> {
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();

  if (!/^[A-Z0-9]{6}$/.test(code)) return { error: "El código debe tener 6 caracteres" };

  const supabase = await createClient();
  const { data: room, error } = await supabase.from("game_rooms").select("id").eq("code", code).single();

  if (error || !room) return { error: "No existe una sala con ese código" };

  return joinRoom(room.id);
}

export async function joinPublicRoom(roomId: string) {
  const result = await joinRoom(roomId);
  if (result?.error) throw new Error(result.error);
}

export async function toggleReady(roomId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: player } = await supabase
    .from("game_room_players")
    .select("is_ready")
    .eq("room_id", roomId)
    .eq("profile_id", profile.id)
    .single();

  if (!player) return;

  await supabase
    .from("game_room_players")
    .update({ is_ready: !player.is_ready })
    .eq("room_id", roomId)
    .eq("profile_id", profile.id);

  revalidatePath(`/rooms/${roomId}`);
}

export async function addBot(roomId: string, difficulty: BotDifficulty) {
  await requireProfile();
  const seat = await nextFreeSeat(roomId);
  const supabase = await createClient();

  const { error } = await supabase
    .from("game_room_players")
    .insert({ room_id: roomId, is_bot: true, bot_difficulty: difficulty, seat, is_ready: true });

  if (error) throw new Error("No se pudo agregar el bot (¿sos el host? ¿la sala permite bots?)");

  revalidatePath(`/rooms/${roomId}`);
}

export async function removePlayer(roomId: string, playerRowId: string) {
  await requireProfile();
  const supabase = await createClient();
  await supabase.from("game_room_players").delete().eq("id", playerRowId).eq("room_id", roomId);
  revalidatePath(`/rooms/${roomId}`);
}

export async function leaveRoom(roomId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: room } = await supabase.from("game_rooms").select("host_id, status").eq("id", roomId).single();

  await supabase.from("game_room_players").delete().eq("room_id", roomId).eq("profile_id", profile.id);

  if (room?.host_id === profile.id && room.status === "waiting") {
    await supabase.from("game_rooms").update({ status: "closed" }).eq("id", roomId);
  }

  redirect("/home");
}

export async function startMatch(roomId: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: room } = await supabase
    .from("game_rooms")
    .select("host_id, status, games(slug)")
    .eq("id", roomId)
    .single();

  if (!room) throw new Error("Sala no encontrada");
  if (room.host_id !== profile.id) throw new Error("Solo el host puede iniciar la partida");
  if (room.status !== "waiting") throw new Error("La partida ya empezó");

  const slug = room.games.slug as GameSlug;
  if (!isGameImplemented(slug)) {
    throw new Error(`${slug.toUpperCase()} todavía no está disponible — se implementa en una fase siguiente`);
  }

  const result = await createMatch(roomId);
  if (!result.ok) throw new Error(result.error);

  revalidatePath(`/rooms/${roomId}`);
}
