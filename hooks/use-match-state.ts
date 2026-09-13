"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
 *
 * `applyLocalState` lets the caller paint the response of su propio POST
 * a /move de una, sin esperar el viaje de ida y vuelta de Realtime — esa
 * espera extra (y, antes, un refetch duplicado sobre el mismo cambio) era
 * la causa principal del lag al jugar. El UPDATE de game_matches sigue
 * escuchado para los movimientos de LOS OTROS jugadores (bots incluidos si
 * responden fuera de tu propia cadena), pero si el cambio que llega es el
 * que nosotros mismos acabamos de aplicar, se lo salta.
 */
export function useMatchState<TState>({ matchId, initialState }: UseMatchStateOptions<TState>) {
  const [state, setState] = useState<TState>(initialState);
  const [isFinished, setIsFinished] = useState(false);
  const suppressNextRemoteRefetch = useRef(false);

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/matches/${matchId}`, { cache: "no-store" });
    if (!res.ok) return;
    const body = await res.json();
    setState(body.state);
    setIsFinished(body.status === "finished");
  }, [matchId]);

  const applyLocalState = useCallback((nextState: TState, finished: boolean) => {
    suppressNextRemoteRefetch.current = true;
    setState(nextState);
    setIsFinished(finished);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(matchChannel(matchId))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_matches", filter: `id=eq.${matchId}` }, () => {
        if (suppressNextRemoteRefetch.current) {
          suppressNextRemoteRefetch.current = false;
          return;
        }
        void refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, refetch]);

  return { state, isFinished, refetch, applyLocalState };
}
