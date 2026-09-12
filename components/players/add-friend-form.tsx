"use client";

import { useRef, useState, useTransition } from "react";
import { sendFriendRequest } from "@/app/(platform)/friends/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function AddFriendForm() {
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={() =>
        startTransition(async () => {
          try {
            await sendFriendRequest(value.trim());
            push({ variant: "success", title: "Solicitud enviada" });
            setValue("");
          } catch (err) {
            push({ variant: "error", title: "No se pudo enviar", description: (err as Error).message });
          }
        })
      }
      className="flex gap-2"
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="usuario"
        required
        className="flex-1 rounded-xl border border-border-strong bg-surface-3/60 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
      />
      <Button type="submit" loading={pending}>
        Agregar
      </Button>
    </form>
  );
}
