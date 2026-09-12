"use client";

import { useActionState } from "react";
import { createRoom } from "@/app/(platform)/rooms/actions";
import { Button } from "@/components/ui/button";
import type { GameSlug } from "@/types/database";

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
          {Array.from({ length: maxPlayersLimit - minPlayers + 1 }, (_, i) => minPlayers + i).map((n) => (
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
