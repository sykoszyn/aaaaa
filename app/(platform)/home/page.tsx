import { PlayCircle } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameCard } from "@/components/games/game-card";
import { LeaderboardPreview } from "@/components/leaderboards/leaderboard-preview";
import { FriendsOnlineList } from "@/components/players/friends-online-list";
import { PublicRoomsList } from "@/components/rooms/public-rooms-list";
import { Button } from "@/components/ui/button";
import { isGameImplemented } from "@/lib/games";
import { getCurrentProfile } from "@/lib/auth/session";
import { getActiveRoomForProfile, getOnlineFriends, getTopLeaderboard, listPublicRooms } from "@/lib/rooms/queries";
import { createClient } from "@/lib/supabase/server";
import type { GameSlug } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Inicio" };

export default async function HomePage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const [{ data: games }, publicRooms, leaderboard, friends, activeRoom] = await Promise.all([
    supabase.from("games").select("*").order("slug"),
    listPublicRooms(),
    getTopLeaderboard(),
    getOnlineFriends(profile.id),
    getActiveRoomForProfile(profile.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface-3 via-surface-3 to-accent/10 p-6">
        <p className="text-sm text-text-dim">Hola, {profile.display_name} 👋</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-text sm:text-3xl">¿A qué jugamos hoy?</h1>

        {activeRoom && (
          <Link href={`/rooms/${activeRoom.id}`} className="mt-4 inline-block">
            <Button size="lg">
              <PlayCircle className="size-5" />
              Continuar partida de {activeRoom.games.name}
            </Button>
          </Link>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-text">¿A qué jugamos?</h2>
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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Salas públicas activas</CardTitle>
            <Link href="/rooms" className="text-xs text-accent-hover hover:underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent>
            <PublicRoomsList rooms={publicRooms} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ranking global</CardTitle>
            <Link href="/leaderboards" className="text-xs text-accent-hover hover:underline">
              Ver todo
            </Link>
          </CardHeader>
          <CardContent>
            <LeaderboardPreview entries={leaderboard} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Amigos</CardTitle>
            <Link href="/friends" className="text-xs text-accent-hover hover:underline">
              Gestionar
            </Link>
          </CardHeader>
          <CardContent>
            <FriendsOnlineList friends={friends} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
