"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CardFace } from "@/components/games/uno/card-face";
import { ColorPickerDialog } from "@/components/games/uno/color-picker-dialog";
import { OpponentSeat } from "@/components/games/uno/opponent-seat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useMatchState } from "@/hooks/use-match-state";
import { postMove } from "@/lib/games/client";
import { isWildCard } from "@/lib/games/uno/deck";
import type { UnoCard, UnoColor, UnoPlayerView } from "@/lib/games/uno";

interface SeatInfo {
  seat: number;
  name: string;
  avatarUrl: string | null;
  isBot: boolean;
}

interface UnoTableProps {
  matchId: string;
  roomId: string;
  seat: number;
  initialView: UnoPlayerView;
  players: SeatInfo[];
}

const COLOR_DOT: Record<UnoColor, string> = {
  red: "bg-[#e33]",
  yellow: "bg-[#eab308]",
  green: "bg-[#22b455]",
  blue: "bg-[#3b82f6]",
};

export function UnoTable({ matchId, roomId, seat, initialView, players }: UnoTableProps) {
  const { state: view, refetch } = useMatchState<UnoPlayerView>({ matchId, initialState: initialView });
  const { push } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);

  const isMyTurn = view.currentSeat === seat && !view.finished;

  const send = (type: string, payload: unknown) =>
    startTransition(async () => {
      const result = await postMove(matchId, type, payload);
      if (!result.ok) push({ variant: "error", title: "Movimiento inválido", description: result.error });
      else void refetch();
    });

  const handleCardClick = (card: UnoCard) => {
    if (!isMyTurn || pending) return;
    if (isWildCard(card.value)) {
      setPendingWildCard(card);
      return;
    }
    send("play_card", { type: "play_card", cardId: card.id });
  };

  const handleChooseColor = (color: UnoColor) => {
    if (!pendingWildCard) return;
    send("play_card", { type: "play_card", cardId: pendingWildCard.id, chosenColor: color });
    setPendingWildCard(null);
  };

  const infoBySeat = new Map(players.map((p) => [p.seat, p]));
  const self = infoBySeat.get(seat);

  if (view.finished) {
    const won = view.winnerSeat === seat;
    const winnerName = infoBySeat.get(view.winnerSeat ?? -1)?.name ?? "Alguien";

    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="font-display text-4xl font-black text-text">
          {won ? "¡Ganaste! 🎉" : `Ganó ${winnerName}`}
        </p>
        <p className="text-text-dim">{won ? "Sumaste puntos por las cartas que les quedaron a los demás." : "Mejor suerte la próxima."}</p>
        <Button size="lg" onClick={() => router.push(`/rooms/${roomId}`)}>
          Volver a la sala
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`size-3 rounded-full ${COLOR_DOT[view.currentColor]}`} />
          <p className="text-sm text-text-dim">
            {isMyTurn ? "Tu turno" : `Turno de ${infoBySeat.get(view.currentSeat)?.name ?? "..."}`}
          </p>
        </div>
        <Badge variant="neutral">{view.direction === 1 ? "Sentido horario" : "Sentido antihorario"}</Badge>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {players
          .filter((p) => p.seat !== seat)
          .map((p) => {
            const opponent = view.opponents.find((o) => o.seat === p.seat);
            return (
              <OpponentSeat
                key={p.seat}
                name={p.name}
                avatarUrl={p.avatarUrl}
                cardCount={opponent?.cardCount ?? 0}
                isCurrentTurn={view.currentSeat === p.seat}
                exposedToUnoChallenge={view.mustCallUnoSeat === p.seat}
                onChallenge={() => send("challenge_uno", { type: "challenge_uno", targetSeat: p.seat })}
              />
            );
          })}
      </div>

      <div className="flex items-center justify-center gap-6 rounded-2xl border border-border bg-surface-3/30 py-6">
        <button
          onClick={() => isMyTurn && send("draw_card", { type: "draw_card" })}
          disabled={!isMyTurn || pending}
          className="flex flex-col items-center gap-1 disabled:opacity-50"
        >
          <CardFace faceDown size="lg" />
          <span className="text-xs text-text-faint">Mazo ({view.deckCount})</span>
        </button>

        {view.topCard && <CardFace card={view.topCard} size="lg" />}
      </div>

      <div className="flex flex-col items-center gap-2">
        {view.mustCallUnoSeat === seat && (
          <Button variant="secondary" onClick={() => send("call_uno", { type: "call_uno" })} disabled={pending}>
            ¡Cantar UNO!
          </Button>
        )}

        <div className="flex flex-wrap justify-center gap-2">
          {view.self.hand.map((card) => (
            <CardFace
              key={card.id}
              card={card}
              size="md"
              disabled={!isMyTurn || pending}
              onClick={isMyTurn ? () => handleCardClick(card) : undefined}
            />
          ))}
        </div>
        <p className="text-xs text-text-faint">{self?.name ?? "Vos"} · {view.self.hand.length} cartas</p>
      </div>

      <ColorPickerDialog open={!!pendingWildCard} onClose={() => setPendingWildCard(null)} onChoose={handleChooseColor} />
    </div>
  );
}
