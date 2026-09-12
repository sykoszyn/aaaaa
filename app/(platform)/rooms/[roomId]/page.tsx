import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GameBoard } from "@/components/games/game-board";
import { RoomLobby } from "@/components/rooms/room-lobby";
import { isGameImplemented } from "@/lib/games";
import { getStateForSeat } from "@/lib/games/core/engine";
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

  if (room.status === "in_progress") {
    const { data: match } = await supabase
      .from("game_matches")
      .select("id, game_match_players(seat, profile_id, is_bot, profiles(username, display_name, avatar_url))")
      .eq("room_id", roomId)
      .eq("status", "in_progress")
      .single();

    const selfSeat = match?.game_match_players.find((p) => p.profile_id === profile.id)?.seat;

    if (match && selfSeat !== undefined) {
      const result = await getStateForSeat(match.id, selfSeat);

      if (result.ok) {
        return (
          <GameBoard
            gameSlug={room.games.slug as GameSlug}
            matchId={match.id}
            roomId={roomId}
            seat={selfSeat}
            initialView={result.data}
            players={match.game_match_players.map((p) => ({
              seat: p.seat,
              name: p.is_bot ? "Bot" : p.profiles?.display_name ?? "Jugador",
              avatarUrl: p.profiles?.avatar_url ?? null,
              isBot: p.is_bot,
            }))}
          />
        );
      }
    }
  }

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
