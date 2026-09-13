import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { GameCard } from "@/components/games/game-card";
import { isGameImplemented } from "@/lib/games";
import { countOnlinePlayers } from "@/lib/rooms/queries";
import { createClient } from "@/lib/supabase/server";
import type { GameSlug } from "@/types/database";

// Muestra conteos en vivo (jugadores online) — nunca debe congelarse en el
// build, y las policies de RLS ya permiten leer estos datos sin sesión.
export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const supabase = await createClient();
  const [{ data: games }, { count: playerCount }, onlineCount] = await Promise.all([
    supabase.from("games").select("*").order("slug"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    countOnlinePlayers(),
  ]);

  return (
    <main>
      <section className="relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(139,92,246,0.25),transparent_45%),radial-gradient(circle_at_85%_10%,rgba(34,211,238,0.2),transparent_40%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-black leading-tight text-text sm:text-6xl">
            Truco, UNO, Pool, Bowling y Ludo.
            <br />
            <span className="bg-gradient-to-r from-accent via-cyan to-gold bg-clip-text text-transparent">
              En vivo, contra rivales reales.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-text-dim">
            Creá una sala, compartí el código y jugá en segundos. Sin descargar nada, sin instalar nada — directo
            desde el navegador.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg">
                Jugar gratis ahora
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="secondary">
                Ya tengo cuenta
              </Button>
            </Link>
          </div>

          <div className="mt-10 flex items-center justify-center gap-8 text-sm text-text-dim">
            <div>
              <p className="font-display text-2xl font-bold text-text">{(playerCount ?? 0).toLocaleString("es-AR")}</p>
              <p>jugadores registrados</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <p className="flex items-center justify-center gap-1.5 font-display text-2xl font-bold text-text">
                <span className="size-2 rounded-full bg-success animate-pulse-ring" />
                {(onlineCount ?? 0).toLocaleString("es-AR")}
              </p>
              <p>jugando ahora</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <h2 className="mb-4 text-center font-display text-2xl font-bold text-text">Elegí tu juego</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(games ?? []).map((game) => (
            <GameCard
              key={game.slug}
              slug={game.slug as GameSlug}
              name={game.name}
              minPlayers={game.min_players}
              maxPlayers={game.max_players}
              supportsBots={game.supports_bots}
              implemented={isGameImplemented(game.slug as GameSlug)}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
