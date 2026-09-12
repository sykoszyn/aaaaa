import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoomLobby } from "@/components/rooms/room-lobby";
import { isGameImplemented } from "@/lib/games/core/registry";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { GameSlug } from "@/types/database";

export const metadata: Metadata = { title: "Sala" };

export default async function RoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: room } = await supabase
    .from("game_rooms")
    .select("*, games(name, slug, min_players)")
    .eq("id", roomId)
    .single();
  if (!room) notFound();

  const { data: players } = await supabase
    .from("game_room_players")
    .select("*, profiles(username, display_name, avatar_url)")
    .eq("room_id", roomId)
    .order("seat");

  return (
    <RoomLobby
      roomId={roomId}
      gameName={room.games.name}
      gameImplemented={isGameImplemented(room.games.slug as GameSlug)}
      minPlayers={room.games.min_players}
      initialRoom={room}
      initialPlayers={players ?? []}
      selfProfileId={profile.id}
    />
  );
}
