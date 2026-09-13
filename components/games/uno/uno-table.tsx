"use client";

import { Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CardFace } from "@/components/games/uno/card-face";
import { ColorPickerDialog } from "@/components/games/uno/color-picker-dialog";
import { OpponentSeat } from "@/components/games/uno/opponent-seat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useMatchState } from "@/hooks/use-match-state";
import { playSteps, postMove } from "@/lib/games/client";
import { isWildCard } from "@/lib/games/uno/deck";
import { cn } from "@/utils/cn";
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

const COLOR_GLOW: Record<UnoColor, string> = {
  red: "rgba(229,37,33,0.35)",
  yellow: "rgba(255,201,13,0.35)",
  green: "rgba(23,166,82,0.35)",
  blue: "rgba(11,99,176,0.35)",
};

export function UnoTable({ matchId, roomId, seat, initialView, players }: UnoTableProps) {
  const { state: view, applyLocalState } = useMatchState<UnoPlayerView>({ matchId, initialState: initialView });
  const { push } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [pendingWildCard, setPendingWildCard] = useState<UnoCard | null>(null);

  const isMyTurn = view.currentSeat === seat && !view.finished;

  const send = (type: string, payload: unknown) =>
    startTransition(async () => {
      const result = await postMove<UnoPlayerView>(matchId, type, payload);
      if (!result.ok) push({ variant: "error", title: "Movimiento inválido", description: result.error });
      else await playSteps(result.steps, applyLocalState, result.finished);
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
    <div className="flex flex-col gap-4">
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border-strong bg-surface-3/60 px-4 py-3 transition-colors duration-300",
          isMyTurn && "border-accent/50",
        )}
      >
        <div className="flex items-center gap-2.5">
          <span className={cn("size-3 rounded-full ring-2 ring-white/20", COLOR_DOT[view.currentColor])} />
          <p className={cn("font-display text-base font-bold", isMyTurn ? "text-accent-hover" : "text-text")}>
            {isMyTurn ? "¡Tu turno!" : `Turno de ${infoBySeat.get(view.currentSeat)?.name ?? "..."}`}
          </p>
        </div>
        <Badge variant="neutral">{view.direction === 1 ? "Sentido horario" : "Sentido antihorario"}</Badge>
      </div>

      <div className="rounded-3xl border border-border-strong bg-[radial-gradient(circle_at_50%_0%,var(--color-surface-3),var(--color-ink)_75%)] p-4 sm:p-6">
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
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

        <div className="my-4 flex items-center justify-center gap-6 sm:gap-10">
          <button
            onClick={() => isMyTurn && send("draw_card", { type: "draw_card" })}
            disabled={!isMyTurn || pending}
            className="group flex flex-col items-center gap-2 disabled:opacity-50"
          >
            <CardFace faceDown size="lg" className="transition-transform duration-150 group-enabled:hover:-translate-y-1" />
            <span className="flex items-center gap-1 text-xs font-medium text-text-faint">
              <Layers className="size-3.5" /> Mazo ({view.deckCount})
            </span>
          </button>

          {view.topCard && (
            <div className="relative">
              <div
                className="absolute inset-0 -z-10 scale-110 rounded-full blur-2xl"
                style={{ backgroundColor: COLOR_GLOW[view.currentColor] }}
              />
              <CardFace card={view.topCard} size="lg" className="animate-card-in" />
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-3xl border border-border-strong bg-surface-3/40 p-4">
        {view.mustCallUnoSeat === seat && (
          <Button variant="secondary" onClick={() => send("call_uno", { type: "call_uno" })} disabled={pending} className="animate-pulse-ring">
            ¡Cantar UNO!
          </Button>
        )}

        <div className="scrollbar-thin flex w-full justify-center gap-1 overflow-x-auto px-2 py-2 sm:flex-wrap sm:gap-2">
          {view.self.hand.map((card) => (
            <CardFace
              key={card.id}
              card={card}
              size="md"
              className="shrink-0 first:ml-0 [&:not(:first-child)]:-ml-6 sm:[&:not(:first-child)]:-ml-3"
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
