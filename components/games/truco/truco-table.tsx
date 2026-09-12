"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useTransition } from "react";
import { CardFace } from "@/components/games/truco/card-face";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useMatchState } from "@/hooks/use-match-state";
import { postMove } from "@/lib/games/client";
import { allowedEnvidoRaises, allowedTrucoRaise, hasFlor } from "@/lib/games/truco/rules";
import type { EnvidoLevel, TrucoBetLevel, TrucoPlayerView } from "@/lib/games/truco";

interface SeatInfo {
  seat: number;
  name: string;
  avatarUrl: string | null;
  isBot: boolean;
}

interface TrucoTableProps {
  matchId: string;
  roomId: string;
  seat: number;
  initialView: TrucoPlayerView;
  players: SeatInfo[];
}

const ENVIDO_LABEL: Record<EnvidoLevel, string> = { envido: "Envido", real_envido: "Real envido", falta_envido: "Falta envido" };
const TRUCO_LABEL: Record<TrucoBetLevel, string> = { truco: "Truco", retruco: "Retruco", vale_cuatro: "Vale cuatro" };

export function TrucoTable({ matchId, roomId, seat, initialView, players }: TrucoTableProps) {
  const { state: view, refetch } = useMatchState<TrucoPlayerView>({ matchId, initialState: initialView });
  const { push } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const lastSummaryHand = useRef<number | null>(null);

  useEffect(() => {
    const summary = view.lastHandSummary;
    if (!summary || summary.handNumber === lastSummaryHand.current) return;
    lastSummaryHand.current = summary.handNumber;

    const who = (team: 0 | 1) => (team === view.myTeam ? "Nosotros" : "Ellos");
    const parts: string[] = [];
    if (summary.envido) parts.push(`Envido: ${who(summary.envido.team)} +${summary.envido.points}`);
    if (summary.flor) parts.push(`Flor: ${who(summary.flor.team)} +${summary.flor.points}`);
    if (summary.truco) parts.push(`Mano: ${who(summary.truco.team)} +${summary.truco.points}`);
    push({ variant: "info", title: `Mano ${summary.handNumber}`, description: parts.join(" · ") });
  }, [view.lastHandSummary, view.myTeam, push]);

  const infoBySeat = new Map(players.map((p) => [p.seat, p]));
  const self = infoBySeat.get(seat);
  const isMyTurn = view.currentSeat === seat && !view.finished;

  const send = (type: string, payload: unknown) =>
    startTransition(async () => {
      const result = await postMove(matchId, type, payload);
      if (!result.ok) push({ variant: "error", title: "No se pudo cantar", description: result.error });
      else void refetch();
    });

  if (view.finished) {
    const won = view.winnerTeam === view.myTeam;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <p className="font-display text-4xl font-black text-text">{won ? "¡Ganamos! 🎉" : "Perdimos"}</p>
        <p className="text-text-dim">
          {view.matchScore[view.myTeam]} — {view.matchScore[view.myTeam === 0 ? 1 : 0]}
        </p>
        <Button size="lg" onClick={() => router.push(`/rooms/${roomId}`)}>
          Volver a la sala
        </Button>
      </div>
    );
  }

  const envidoPending = view.envido.pending;
  const trucoPending = view.truco.pending;
  const iRespondEnvido = envidoPending && envidoPending.calledByTeam !== view.myTeam;
  const iRespondTruco = trucoPending && trucoPending.calledByTeam !== view.myTeam;

  const envidoWindowOpen = view.trickNumber === 0 && !view.envido.resolved && !envidoPending && view.flor.declaredSeats.length === 0;
  const envidoOptions = envidoWindowOpen && isMyTurn ? allowedEnvidoRaises(view.envido.calls) : [];

  const nextTrucoLevel = !trucoPending && view.truco.calledByTeam !== view.myTeam && isMyTurn ? allowedTrucoRaise(view.truco.level) : null;

  const canDeclareFlor =
    view.trickNumber === 0 && !view.flor.declaredSeats.includes(seat) && hasFlor(view.self.hand);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <Badge variant="accent">Nosotros {view.matchScore[view.myTeam]}</Badge>
          <Badge variant="neutral">Ellos {view.matchScore[view.myTeam === 0 ? 1 : 0]}</Badge>
        </div>
        <p className="text-xs text-text-faint">a {view.targetScore} puntos · mano #{view.handNumber}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        {players
          .filter((p) => p.seat !== seat)
          .map((p) => (
            <div key={p.seat} className="flex flex-col items-center gap-1">
              <Avatar name={p.name} src={p.avatarUrl} size={36} />
              <p className="text-xs text-text-faint">{p.name}</p>
              {view.currentSeat === p.seat && <span className="size-1.5 rounded-full bg-success" />}
            </div>
          ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-border bg-surface-3/30 py-6">
        {players.map((p) => (
          <div key={p.seat} className="flex flex-col items-center gap-1">
            <CardFace card={view.playedThisTrick[p.seat] ?? undefined} size="md" />
            <span className="text-[10px] text-text-faint">{p.seat === seat ? "Vos" : p.name}</span>
          </div>
        ))}
      </div>

      {(iRespondEnvido || iRespondTruco) && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gold/30 bg-gold/10 p-4">
          <p className="text-sm font-medium text-gold">
            {iRespondEnvido && `Cantaron ${ENVIDO_LABEL[envidoPending!.level]}`}
            {iRespondTruco && `Cantaron ${TRUCO_LABEL[trucoPending!.level]}`}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button disabled={pending} onClick={() => send("respond_bid", { type: "respond_bid", accept: true })}>
              Quiero
            </Button>
            <Button variant="secondary" disabled={pending} onClick={() => send("respond_bid", { type: "respond_bid", accept: false })}>
              No quiero
            </Button>
            {iRespondEnvido &&
              allowedEnvidoRaises(view.envido.calls)
                .filter((l) => l !== envidoPending!.level)
                .map((level) => (
                  <Button
                    key={level}
                    variant="ghost"
                    disabled={pending}
                    onClick={() => send("call_envido", { type: "call_envido", level })}
                  >
                    {ENVIDO_LABEL[level]}
                  </Button>
                ))}
            {iRespondTruco &&
              (() => {
                const raise = allowedTrucoRaise(trucoPending!.level);
                return raise ? (
                  <Button variant="ghost" disabled={pending} onClick={() => send("call_truco", { type: "call_truco", level: raise })}>
                    {TRUCO_LABEL[raise]}
                  </Button>
                ) : null;
              })()}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {envidoOptions.map((level) => (
          <Button key={level} variant="secondary" size="sm" disabled={pending} onClick={() => send("call_envido", { type: "call_envido", level })}>
            {ENVIDO_LABEL[level]}
          </Button>
        ))}
        {nextTrucoLevel && (
          <Button size="sm" disabled={pending} onClick={() => send("call_truco", { type: "call_truco", level: nextTrucoLevel })}>
            {TRUCO_LABEL[nextTrucoLevel]}
          </Button>
        )}
        {canDeclareFlor && (
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => send("declare_flor", { type: "declare_flor" })}>
            Flor
          </Button>
        )}
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => send("go_to_deck", { type: "go_to_deck" })}>
          Irse al mazo
        </Button>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-wrap justify-center gap-2">
          {view.self.hand.map((card) => (
            <CardFace
              key={card.id}
              card={card}
              disabled={!isMyTurn || pending || !!envidoPending || !!trucoPending}
              onClick={
                isMyTurn && !envidoPending && !trucoPending
                  ? () => send("play_card", { type: "play_card", cardId: card.id })
                  : undefined
              }
            />
          ))}
        </div>
        <p className="text-xs text-text-faint">{self?.name ?? "Vos"}</p>
      </div>
    </div>
  );
}
