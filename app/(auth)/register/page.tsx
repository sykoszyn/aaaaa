"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState(signUp, null);

  return (
    <Card>
      <CardContent className="p-6">
        <h1 className="font-display text-2xl font-bold text-text">Creá tu cuenta</h1>
        <p className="mt-1 text-sm text-text-dim">Gratis. Empezás a jugar en menos de un minuto.</p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-xs font-medium text-text-dim">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              placeholder="elmatador10"
              className="w-full rounded-xl border border-border-strong bg-surface-3/60 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
            />
          </div>
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
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-xl border border-border-strong bg-surface-3/60 px-3 py-2.5 text-sm text-text outline-none focus:border-accent"
            />
          </div>

          {state?.error && <p className="text-sm text-danger">{state.error}</p>}

          <Button type="submit" loading={pending} className="mt-1 w-full">
            Crear cuenta
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-text-dim">
          ¿Ya jugás?{" "}
          <Link href="/login" className="font-medium text-accent-hover hover:underline">
            Entrá acá
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
