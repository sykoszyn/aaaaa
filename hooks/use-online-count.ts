"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Live "jugadores online" counter. Listens to UPDATE on profiles and
 * adjusts by the is_online delta instead of re-querying — cheap enough for
 * the scale a lobby counter needs, and avoids a filter Realtime can't
 * express (it can only filter on equality of a column's *new* value, not
 * "did this column change").
 *
 * Límite conocido: esto solo cuenta transiciones reales del booleano
 * is_online. Una pestaña que se cierra de golpe nunca dispara ese
 * "false" (ver lib/rooms/queries.ts sobre por qué las consultas SSR
 * filtran también por last_seen_at reciente en vez de confiar ciegamente
 * en is_online) — así que en una sesión muy larga este contador en vivo
 * puede ir quedando un poco por encima del real hasta el próximo refresh
 * de la página (que vuelve a pedir el conteo correcto por frescura). Es
 * un contador decorativo, no algo de lo que dependa la lógica del juego,
 * así que este margen es aceptable.
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
