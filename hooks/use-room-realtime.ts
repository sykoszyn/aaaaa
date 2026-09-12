"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { roomChannel } from "@/lib/realtime/channels";
import type { Database } from "@/types/database";

type Room = Database["public"]["Tables"]["game_rooms"]["Row"];

/** Row plus the joined profile info the initial server query embeds —
 * realtime payloads never carry embedded relations, so every update below
 * merges into the existing object instead of replacing it wholesale. */
export type RoomPlayer = Database["public"]["Tables"]["game_room_players"]["Row"] & {
  profiles: { username: string; display_name: string; avatar_url: string | null } | null;
};

interface UseRoomRealtimeOptions {
  roomId: string;
  initialRoom: Room;
  initialPlayers: RoomPlayer[];
  selfProfileId: string;
}

/**
 * Keeps a room's lobby state (settings, status, seated players) in sync
 * live. game_rooms/game_room_players have no hidden per-player data, so —
 * unlike match state — it's safe to apply the realtime payload directly.
 * Also tracks Presence so "quién está realmente conectado ahora" (green
 * dot) can differ from `connection_status` in the DB, which only updates
 * on explicit join/leave/disconnect events.
 */
export function useRoomRealtime({ roomId, initialRoom, initialPlayers, selfProfileId }: UseRoomRealtimeOptions) {
  const [room, setRoom] = useState(initialRoom);
  const [players, setPlayers] = useState(initialPlayers);
  const [onlineProfileIds, setOnlineProfileIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(roomChannel(roomId))
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}` }, (payload) => {
        if (payload.eventType === "DELETE") return;
        setRoom(payload.new as Room);
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_room_players", filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as Database["public"]["Tables"]["game_room_players"]["Row"];
            // Merge onto the existing object — the raw row has no `profiles`
            // field, so replacing wholesale would drop the avatar/name we
            // already fetched server-side.
            setPlayers((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
            return;
          }

          if (payload.eventType === "DELETE") {
            const removed = payload.old as { id: string };
            setPlayers((prev) => prev.filter((p) => p.id !== removed.id));
            return;
          }

          if (payload.eventType === "INSERT") {
            const inserted = payload.new as Database["public"]["Tables"]["game_room_players"]["Row"];
            if (inserted.is_bot || !inserted.profile_id) {
              setPlayers((prev) => [...prev, { ...inserted, profiles: null }]);
              return;
            }
            // Realtime never carries embedded relations, so fetch the
            // profile once to show a real name/avatar instead of "Jugador".
            void supabase
              .from("profiles")
              .select("username, display_name, avatar_url")
              .eq("id", inserted.profile_id)
              .single()
              .then(({ data: profile }) => {
                setPlayers((prev) => [...prev, { ...inserted, profiles: profile ?? null }]);
              });
          }
        },
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ profileId: string }>();
        setOnlineProfileIds(new Set(Object.values(state).flat().map((p) => p.profileId)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ profileId: selfProfileId, onlineAt: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, selfProfileId]);

  return { room, players, onlineProfileIds };
}
