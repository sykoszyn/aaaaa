"use client";

import { useActionState } from "react";
import { updateProfileSettings } from "@/app/(platform)/profile/settings/actions";
import { Button } from "@/components/ui/button";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const GAMES = [
  { value: "", label: "Sin preferencia" },
  { value: "uno", label: "UNO" },
  { value: "truco", label: "Truco Argentino" },
  { value: "pool", label: "Pool" },
  { value: "bowling", label: "Bowling" },
  { value: "ludo", label: "Ludo" },
];

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, formAction, pending] = useActionState(updateProfileSettings, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="displayName" className="mb-1 block text-xs font-medium text-text-dim">
          Nombre visible
        </label>
        <input
          id="displayName"
          name="displayName"
          defaultValue={profile.display_name}
          maxLength={30}
          required
          className="w-full rounded-xl border border-border-strong bg-surface-3/60 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
        />
      </div>

      <div>
        <label htmlFor="bio" className="mb-1 block text-xs font-medium text-text-dim">
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          defaultValue={profile.bio ?? ""}
          maxLength={160}
          rows={3}
          className="w-full rounded-xl border border-border-strong bg-surface-3/60 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
        />
      </div>

      <div>
        <label htmlFor="favoriteGame" className="mb-1 block text-xs font-medium text-text-dim">
          Juego favorito
        </label>
        <select
          id="favoriteGame"
          name="favoriteGame"
          defaultValue={profile.favorite_game ?? ""}
          className="w-full rounded-xl border border-border-strong bg-surface-3/60 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
        >
          {GAMES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.success && <p className="text-sm text-success">Guardado</p>}

      <Button type="submit" loading={pending}>
        Guardar cambios
      </Button>
    </form>
  );
}
