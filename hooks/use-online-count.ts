"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Live "jugadores online" counter. Listens to UPDATE on profiles and
 * adjusts by the is_online delta instead of re-querying — cheap enough for
 * the scale a lobby counter needs, and avoids a filter Realtime can't
 * express (it can only filter on equality of a column's *new* value, not
 * "did this column change").
 */
export function useOnlineCount(initialCount: number) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("online-count")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        (payload) => {
          const wasOnline = (payload.old as { is_online?: boolean }).is_online;
          const isOnline = (payload.new as { is_online: boolean }).is_online;
          if (wasOnline === isOnline) return;
          setCount((prev) => Math.max(0, prev + (isOnline ? 1 : -1)));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
