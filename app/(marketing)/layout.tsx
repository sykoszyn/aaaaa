import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-cyan font-display text-sm font-black text-white">
            JA
          </span>
          <span className="font-display text-lg font-bold text-text">Juegos Argentinos</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Entrar
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Jugar gratis</Button>
          </Link>
        </div>
      </header>
      {children}
      <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-text-faint sm:px-6">
        © {new Date().getFullYear()} Juegos Argentinos. Hecho con 🧉 y mucho truco.
      </footer>
    </div>
  );
}
