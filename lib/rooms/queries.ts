import { createClient } from "@/lib/supabase/server";

/**
 * "Online" se define como is_online=true Y un heartbeat reciente — nunca
 * confiamos solo en el booleano. useOnlineHeartbeat (hooks/use-online-
 * heartbeat.ts) refresca profiles.last_seen_at cada 25s, así que una
 * pestaña que se cerró de golpe (sin disparar el pingOffline del unmount)
 * deja de contar como online en como mucho este margen — sin depender de
 * un cron corriendo a cada minuto para "corregir" el booleano (Vercel
 * Hobby solo permite cron jobs diarios; ver vercel.json).
 */
const ONLINE_THRESHOLD_MS = 90_000;

export function onlineSinceIso(): string {
  return new Date(Date.now() - ONLINE_THRESHOLD_MS).toISOString();
}

export async function listPublicRooms(limit = 12) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("game_rooms")
    .select("id, code, max_players, created_at, games(slug, name), game_room_players(count)")
    .eq("visibility", "public")
    .eq("status", "waiting")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function countOnlinePlayers() {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("is_online", true)
    .gt("last_seen_at", onlineSinceIso());

  return count ?? 0;
}

/**
 * Ranking global preview para la Home. `leaderboards` es por-juego y solo
 * tiene filas después de que se jueguen partidas (Fase 2+); mientras tanto
 * ordenamos por XP directamente sobre profiles, que sí existe desde el
 * primer signup — datos reales (aunque sean todos 0), no un placeholder.
 */
export async function getTopLeaderboard(limit = 5) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url, level, xp")
    .order("xp", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function getActiveRoomForProfile(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("game_room_players")
    .select("game_rooms(id, status, games(name, slug))")
    .eq("profile_id", profileId)
    .in("game_rooms.status", ["waiting", "in_progress"])
    .limit(1)
    .maybeSingle();

  return data?.game_rooms ?? null;
}

export async function getOnlineFriends(profileId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("friends")
    .select("profile_id_a, profile_id_b")
    .or(`profile_id_a.eq.${profileId},profile_id_b.eq.${profileId}`);

  const friendIds = (data ?? []).map((f) => (f.profile_id_a === profileId ? f.profile_id_b : f.profile_id_a));
  if (friendIds.length === 0) return [];

  const { data: friends } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, is_online, last_seen_at")
    .in("id", friendIds);

  const since = onlineSinceIso();
  return (friends ?? [])
    .map((f) => ({ ...f, is_online: f.is_online && f.last_seen_at > since }))
    .sort((a, b) => Number(b.is_online) - Number(a.is_online));
}
