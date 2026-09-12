"use client";

import { Bot, Check, Crown, UserX, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { addBot, leaveRoom, removePlayer, startMatch, toggleReady } from "@/app/(platform)/rooms/actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyCodeButton } from "@/components/rooms/copy-code-button";
import { useToast } from "@/components/ui/toast";
import { useRoomRealtime, type RoomPlayer } from "@/hooks/use-room-realtime";
import type { Database } from "@/types/database";

type Room = Database["public"]["Tables"]["game_rooms"]["Row"];

interface RoomLobbyProps {
  roomId: string;
  gameName: string;
  gameImplemented: boolean;
  minPlayers: number;
  initialRoom: Room;
  initialPlayers: RoomPlayer[];
  selfProfileId: string;
}

export function RoomLobby({
  roomId,
  gameName,
  gameImplemented,
  minPlayers,
  initialRoom,
  initialPlayers,
  selfProfileId,
}: RoomLobbyProps) {
  const { room, players, onlineProfileIds } = useRoomRealtime({
    roomId,
    initialRoom,
    initialPlayers,
    selfProfileId,
  });
  const { push } = useToast();
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // El host dispara el cambio a "in_progress" y ve el tablero al instante
  // (revalidatePath refresca su propia vista). El resto de los jugadores
  // solo se enteran por Realtime — sin este efecto se quedarían mirando el
  // lobby vacío. router.refresh() vuelve a pedir el Server Component de
  // esta ruta, que ya elige renderizar el tablero en vez del lobby.
  const wasWaiting = useRef(room.status === "waiting");
  useEffect(() => {
    if (wasWaiting.current && room.status !== "waiting") {
      router.refresh();
    }
    wasWaiting.current = room.status === "waiting";
  }, [room.status, router]);

  const isHost = room.host_id === selfProfileId;
  const self = players.find((p) => p.profile_id === selfProfileId);
  const humanPlayers = players.filter((p) => !p.is_bot);
  const allReady = humanPlayers.every((p) => p.is_ready);
  const canStart = isHost && gameImplemented && players.length >= minPlayers && allReady && room.status === "waiting";

  const run = (fn: () => Promise<void>, errorTitle: string) =>
    startTransition(() => {
      fn().catch((err: Error) => push({ variant: "error", title: errorTitle, description: err.message }));
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-text-dim">{gameName}</p>
          <h1 className="font-display text-2xl font-bold text-text">Sala de espera</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-text-faint">Código</p>
            <CopyCodeButton code={room.code} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: room.max_players }, (_, seat) => {
          const player = players.find((p) => p.seat === seat);

          if (!player) {
            return (
              <div
                key={seat}
                className="flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong text-text-faint"
              >
                <span className="text-xs">Esperando jugador…</span>
                {isHost && room.allow_bots && (
                  <button
                    onClick={() => run(() => addBot(roomId, "normal"), "No se pudo agregar el bot")}
                    className="flex items-center gap-1 text-xs text-accent-hover hover:underline"
                    disabled={pending}
                  >
                    <Bot className="size-3.5" /> Agregar bot
                  </button>
                )}
              </div>
            );
          }

          const online = player.is_bot || onlineProfileIds.has(player.profile_id ?? "");
          const name = player.is_bot ? `Bot (${player.bot_difficulty})` : player.profiles?.display_name ?? "Jugador";

          return (
            <div
              key={player.id}
              className="relative flex h-28 flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-3/40"
            >
              {room.host_id === player.profile_id && (
                <Crown className="absolute left-2 top-2 size-3.5 text-gold" aria-label="Host" />
              )}
              {isHost && player.profile_id !== selfProfileId && (
                <button
                  onClick={() => run(() => removePlayer(roomId, player.id), "No se pudo quitar al jugador")}
                  className="absolute right-2 top-2 text-text-faint hover:text-danger"
                  aria-label="Quitar"
                >
                  {player.is_bot ? <UserX className="size-3.5" /> : <X className="size-3.5" />}
                </button>
              )}
              <Avatar
                src={player.profiles?.avatar_url}
                name={name}
                size={40}
                online={player.is_bot ? undefined : online}
              />
              <p className="max-w-[90%] truncate text-sm font-medium text-text">{name}</p>
              <Badge variant={player.is_ready ? "success" : "neutral"}>
                {player.is_ready ? "Listo" : "Esperando"}
              </Badge>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {self && !self.is_bot && (
          <Button
            variant={self.is_ready ? "secondary" : "primary"}
            onClick={() => run(() => toggleReady(roomId), "No se pudo actualizar tu estado")}
            disabled={pending}
          >
            <Check className="size-4" />
            {self.is_ready ? "Ya no estoy listo" : "Estoy listo"}
          </Button>
        )}

        {isHost && (
          <Button
            variant="primary"
            disabled={!canStart || pending}
            onClick={() => run(() => startMatch(roomId), "No se pudo iniciar la partida")}
            title={!gameImplemented ? `${gameName} todavía no está implementado` : undefined}
          >
            Iniciar partida
          </Button>
        )}

        <Button variant="ghost" onClick={() => run(() => leaveRoom(roomId), "No se pudo salir de la sala")} disabled={pending}>
          Salir de la sala
        </Button>
      </div>

      {!gameImplemented && (
        <p className="text-sm text-text-faint">
          {gameName} todavía está en construcción — podés coordinar acá, pero la partida no se puede iniciar hasta
          que se implemente el motor del juego.
        </p>
      )}
    </div>
  );
}
