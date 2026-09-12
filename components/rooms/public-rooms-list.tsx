"use client";

import { DoorOpen } from "lucide-react";
import { useTransition } from "react";
import { joinPublicRoom } from "@/app/(platform)/rooms/actions";
import { EmptyState } from "@/components/ui/empty-state";
import { RoomListItem } from "@/components/rooms/room-list-item";
import { useToast } from "@/components/ui/toast";

interface PublicRoom {
  id: string;
  code: string;
  max_players: number;
  games: { name: string } | null;
  game_room_players: { count: number }[];
}

export function PublicRoomsList({ rooms }: { rooms: PublicRoom[] }) {
  const { push } = useToast();
  const [, startTransition] = useTransition();

  if (rooms.length === 0) {
    return (
      <EmptyState
        icon={DoorOpen}
        title="No hay salas públicas abiertas"
        description="Creá una desde cualquier juego y compartí el código con tus amigos."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {rooms.map((room) => (
        <RoomListItem
          key={room.id}
          code={room.code}
          gameName={room.games?.name ?? "Juego"}
          playerCount={room.game_room_players[0]?.count ?? 0}
          maxPlayers={room.max_players}
          onJoin={() =>
            startTransition(() => {
              joinPublicRoom(room.id).catch((err: Error) =>
                push({ variant: "error", title: "No se pudo unir a la sala", description: err.message }),
              );
            })
          }
        />
      ))}
    </div>
  );
}
