"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { matchChannel } from "@/lib/realtime/channels";

interface UseMatchStateOptions<TState> {
  matchId: string;
  initialState: TState;
}

/**
 * See lib/realtime/channels.ts for why this refetches through the API
 * instead of reading the realtime payload directly: the row can contain
 * information other seats aren't allowed to see, so only the server's
 * toPlayerView() output is ever trusted here.
 */
export function useMatchState<TState>({ matchId, initialState }: UseMatchStateOptions<TState>) {
  const [state, setState] = useState<TState>(initialState);
  const [isFinished, setIsFinished] = useState(false);

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/matches/${matchId}`, { cache: "no-store" });
    if (!res.ok) return;
    const body = await res.json();
    setState(body.state);
    setIsFinished(body.status === "finished");
  }, [matchId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(matchChannel(matchId))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_matches", filter: `id=eq.${matchId}` }, () => {
        void refetch();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_events", filter: `match_id=eq.${matchId}` }, () => {
        void refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, refetch]);

  return { state, isFinished, refetch };
}
