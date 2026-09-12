import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { LeaderboardPreview } from "@/components/leaderboards/leaderboard-preview";
import { createClient } from "@/lib/supabase/server";
import type { GameSlug } from "@/types/database";

export const metadata: Metadata = { title: "Rankings" };

export default async function LeaderboardsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameFilter } = await searchParams;
  const supabase = await createClient();

  const [{ data: games }, globalRanking] = await Promise.all([
    supabase.from("games").select("slug, name").order("slug"),
    supabase.from("profiles").select("username, display_name, avatar_url, level, xp").order("xp", { ascending: false }).limit(50),
  ]);

  let gameRanking: { rating: number; profiles: { username: string; display_name: string; avatar_url: string | null; level: number } }[] = [];
  if (gameFilter) {
    const { data: game } = await supabase.from("games").select("id").eq("slug", gameFilter as GameSlug).single();
    if (game) {
      const { data } = await supabase
        .from("leaderboards")
        .select("rating, profiles(username, display_name, avatar_url, level)")
        .eq("game_id", game.id)
        .eq("period", "all_time")
        .order("rating", { ascending: false })
        .limit(50);
      gameRanking = (data ?? []) as typeof gameRanking;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Rankings</h1>
        <p className="mt-1 text-text-dim">Los mejores jugadores de Juegos Argentinos.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href="/leaderboards"
          className={`rounded-full px-3 py-1.5 text-sm ${!gameFilter ? "bg-accent text-white" : "bg-surface-3 text-text-dim"}`}
        >
          Global
        </a>
        {(games ?? []).map((g) => (
          <a
            key={g.slug}
            href={`/leaderboards?game=${g.slug}`}
            className={`rounded-full px-3 py-1.5 text-sm ${gameFilter === g.slug ? "bg-accent text-white" : "bg-surface-3 text-text-dim"}`}
          >
            {g.name}
          </a>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          {gameFilter ? (
            <LeaderboardPreview
              entries={gameRanking.map((r) => ({ ...r.profiles, xp: r.rating }))}
            />
          ) : (
            <LeaderboardPreview entries={globalRanking.data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
