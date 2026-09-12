import { TriangleAlert, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { JoinByCodeForm } from "@/components/rooms/join-by-code-form";
import { CreateRoomForm } from "@/components/rooms/create-room-form";
import { PublicRoomsList } from "@/components/rooms/public-rooms-list";
import { isGameImplemented } from "@/lib/games/core/registry";
import { createClient } from "@/lib/supabase/server";
import type { GameSlug } from "@/types/database";

const VALID_SLUGS: GameSlug[] = ["uno", "truco", "pool", "bowling", "ludo"];

export async function generateMetadata({ params }: { params: Promise<{ game: string }> }): Promise<Metadata> {
  const { game } = await params;
  return { title: game.charAt(0).toUpperCase() + game.slice(1) };
}

export default async function GameDetailPage({ params }: { params: Promise<{ game: string }> }) {
  const { game: slug } = await params;
  if (!VALID_SLUGS.includes(slug as GameSlug)) notFound();
  const gameSlug = slug as GameSlug;

  const supabase = await createClient();
  const { data: game } = await supabase.from("games").select("*").eq("slug", gameSlug).single();
  if (!game) notFound();

  const { data: publicRooms } = await supabase
    .from("game_rooms")
    .select("id, code, max_players, games(name), game_room_players(count)")
    .eq("game_id", game.id)
    .eq("visibility", "public")
    .eq("status", "waiting")
    .order("created_at", { ascending: false })
    .limit(10);

  const implemented = isGameImplemented(slug as GameSlug);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">{game.name}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-text-dim">
          <Users className="size-4" />
          {game.min_players === game.max_players ? game.min_players : `${game.min_players}-${game.max_players}`} jugadores
          {game.supports_bots && " · admite bots"}
        </p>
      </div>

      {!implemented && (
        <div className="flex items-start gap-2 rounded-xl border border-gold/30 bg-gold/10 p-3 text-sm text-gold">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            {game.name} todavía está en construcción. Podés crear una sala y coordinar con amigos, pero por ahora no
            se puede iniciar la partida — lo habilitamos en una próxima fase.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 font-display text-base font-semibold text-text">Crear sala</h2>
            <CreateRoomForm gameSlug={slug as GameSlug} maxPlayersLimit={game.max_players} minPlayers={game.min_players} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 font-display text-base font-semibold text-text">Unirme con código</h2>
            <JoinByCodeForm />
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold text-text">Salas públicas de {game.name}</h2>
        <PublicRoomsList rooms={publicRooms ?? []} />
      </div>
    </div>
  );
}
