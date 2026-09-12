"use client";

import { useActionState } from "react";
import { joinRoomByCode } from "@/app/(platform)/rooms/actions";
import { Button } from "@/components/ui/button";

export function JoinByCodeForm() {
  const [state, formAction, pending] = useActionState(joinRoomByCode, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="code" className="mb-1 block text-xs font-medium text-text-dim">
          Código de sala
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          maxLength={6}
          placeholder="X7K9P2"
          className="w-full rounded-xl border border-border-strong bg-surface-3/60 px-3 py-2.5 text-center font-display text-lg font-bold uppercase tracking-widest text-text outline-none focus:border-accent"
        />
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <Button type="submit" variant="secondary" loading={pending}>
        Unirme a la sala
      </Button>
    </form>
  );
}
