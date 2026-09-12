"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, null);

  return (
    <Card>
      <CardContent className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Volver a jugar</h1>
        <p className="mt-1 text-sm text-text-dim">Entrá con tu cuenta de Juegos Argentinos.</p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium text-text-dim">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-border-strong bg-surface-3/60 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-medium text-text-dim">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-border-strong bg-surface-3/60 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
            />
          </div>

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}

          <Button type="submit" loading={pending} className="mt-1 w-full">
            Entrar
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-text-dim">
          ¿No tenés cuenta?{" "}
          <Link href="/register" className="font-medium text-accent-hover hover:underline">
            Registrate
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
