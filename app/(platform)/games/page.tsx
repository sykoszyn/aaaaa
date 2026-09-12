import type { Metadata } from "next";
import { GameCard } from "@/components/games/game-card";
import { isGameImplemented } from "@/lib/games/core/registry";
import { createClient } from "@/lib/supabase/server";
import type { GameSlug } from "@/types/database";

export const metadata: Metadata = { title: "Juegos" };

export default async function GamesPage() {
  const supabase = await createClient();
  const { data: games } = await supabase.from("games").select("*").order("slug");

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-bold text-text">Juegos</h1>
      <p className="mb-6 text-text-dim">Elegí uno, creá una sala y compartí el código con tus amigos.</p>

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
    </div>
  );
}
