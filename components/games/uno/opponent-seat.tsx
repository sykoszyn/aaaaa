import { AlertTriangle } from "lucide-react";
import { CardFace } from "@/components/games/uno/card-face";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface OpponentSeatProps {
  name: string;
  avatarUrl?: string | null;
  cardCount: number;
  isCurrentTurn: boolean;
  exposedToUnoChallenge: boolean;
  onChallenge?: () => void;
}

export function OpponentSeat({ name, avatarUrl, cardCount, isCurrentTurn, exposedToUnoChallenge, onChallenge }: OpponentSeatProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-colors duration-300",
        isCurrentTurn ? "bg-accent/10 ring-1 ring-accent/50 shadow-glow-accent" : "ring-1 ring-transparent",
      )}
    >
      <div className="relative">
        <Avatar name={name} src={avatarUrl} size={52} />
        {isCurrentTurn && <span className="absolute -inset-1.5 -z-10 animate-pulse-ring rounded-full" />}
      </div>
      <p className="max-w-[96px] truncate text-sm font-semibold text-text">{name}</p>

      <div className="flex -space-x-7">
        {Array.from({ length: Math.min(cardCount, 7) }, (_, i) => (
          <CardFace key={i} faceDown size="sm" className="!h-11 !w-8 shadow-none" />
        ))}
      </div>
      <p className="text-[11px] font-medium text-text-faint">{cardCount} {cardCount === 1 ? "carta" : "cartas"}</p>

      {exposedToUnoChallenge && (
        <Button size="sm" variant="danger" onClick={onChallenge} className="mt-1 animate-pulse-ring gap-1 text-xs">
          <AlertTriangle className="size-3" /> ¡No cantó UNO!
        </Button>
      )}
    </div>
  );
}
