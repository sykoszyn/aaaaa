import { Swords, Trophy } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { XpBar } from "@/components/players/xp-bar";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase.from("profiles").select("*").eq("username", username).single();
  if (!profile) notFound();

  const { data: stats } = await supabase
    .from("player_stats")
    .select("matches_played, matches_won, matches_lost, rating, games(name, slug)")
    .eq("profile_id", profile.id)
    .order("rating", { ascending: false });

  const winRate = profile.matches_played > 0 ? Math.round((profile.matches_won / profile.matches_played) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start">
          <Avatar src={profile.avatar_url} name={profile.display_name} size={80} online={profile.is_online} />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="font-display text-2xl font-bold text-text">{profile.display_name}</h1>
            <p className="text-text-faint">@{profile.username}</p>
            {profile.bio && <p className="mt-2 text-sm text-text-dim">{profile.bio}</p>}
            <XpBar level={profile.level} xp={profile.xp} className="mt-4 max-w-xs" />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="font-display text-xl font-bold text-text">{profile.matches_played}</p>
              <p className="text-xs text-text-faint">Partidas</p>
            </div>
            <div>
              <p className="font-display text-xl font-bold text-success">{winRate}%</p>
              <p className="text-xs text-text-faint">Victorias</p>
            </div>
            <div>
              <p className="font-display text-xl font-bold text-gold">{profile.level}</p>
              <p className="text-xs text-text-faint">Nivel</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-text">
          <Swords className="size-5" /> Estadísticas por juego
        </h2>
        {stats && stats.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {stats.map((s) => (
              <Card key={s.games.slug}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium text-text">{s.games.name}</p>
                    <p className="text-xs text-text-faint">
                      {s.matches_played} partidas · {s.matches_won}V-{s.matches_lost}D
                    </p>
                  </div>
                  <Badge variant="gold" className="gap-1">
                    <Trophy className="size-3" /> {s.rating}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-faint">Todavía no jugó ninguna partida.</p>
        )}
      </div>
    </div>
  );
}
