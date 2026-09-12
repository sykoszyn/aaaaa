import { createClient } from "@/lib/supabase/server";

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
  const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_online", true);

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
    .select("id, username, display_name, avatar_url, is_online")
    .in("id", friendIds)
    .order("is_online", { ascending: false });

  return friends ?? [];
}
