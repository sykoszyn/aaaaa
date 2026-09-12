"use client";

import { useActionState } from "react";
import { createRoom } from "@/app/(platform)/rooms/actions";
import { Button } from "@/components/ui/button";
import type { GameSlug } from "@/types/database";

// El Truco Argentino se juega 1v1 o 2v2 — 3 jugadores no forman equipos
// parejos, así que no se ofrece como opción (a diferencia de UNO, que
// acepta cualquier cantidad dentro de su rango).
const FIXED_PLAYER_COUNTS: Partial<Record<GameSlug, number[]>> = { truco: [2, 4] };

export function CreateRoomForm({
  gameSlug,
  minPlayers,
  maxPlayersLimit,
}: {
  gameSlug: GameSlug;
  minPlayers: number;
  maxPlayersLimit: number;
}) {
  const [state, formAction, pending] = useActionState(createRoom, null);
  const playerCountOptions =
    FIXED_PLAYER_COUNTS[gameSlug] ??
    Array.from({ length: maxPlayersLimit - minPlayers + 1 }, (_, i) => minPlayers + i);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="gameSlug" value={gameSlug} />

      <div>
        <label htmlFor="maxPlayers" className="mb-1 block text-xs font-medium text-text-dim">
          Cantidad de jugadores
        </label>
        <select
          id="maxPlayers"
          name="maxPlayers"
          defaultValue={maxPlayersLimit}
          className="w-full rounded-xl border border-border-strong bg-surface-3/60 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
        >
          {playerCountOptions.map((n) => (
            <option key={n} value={n}>
              {n} jugadores
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="visibility" className="mb-1 block text-xs font-medium text-text-dim">
          Visibilidad
        </label>
        <select
          id="visibility"
          name="visibility"
          defaultValue="public"
          className="w-full rounded-xl border border-border-strong bg-surface-3/60 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
        >
          <option value="public">Pública — cualquiera puede unirse</option>
          <option value="private">Privada — solo con código</option>
        </select>
      </div>

      {gameSlug === "truco" && (
        <>
          <div>
            <label htmlFor="targetScore" className="mb-1 block text-xs font-medium text-text-dim">
              Jugar a
            </label>
            <select
              id="targetScore"
              name="targetScore"
              defaultValue={30}
              className="w-full rounded-xl border border-border-strong bg-surface-3/60 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
            >
              <option value={15}>15 puntos (rápida)</option>
              <option value={30}>30 puntos (completa)</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-text-dim">
            <input type="checkbox" name="florEnabled" className="size-4 rounded border-border-strong accent-accent" />
            Habilitar flor
          </label>
        </>
      )}

      <label className="flex items-center gap-2 text-sm text-text-dim">
        <input type="checkbox" name="allowBots" defaultChecked className="size-4 rounded border-border-strong accent-accent" />
        Permitir bots
      </label>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" loading={pending}>
        Crear sala
      </Button>
    </form>
  );
}
