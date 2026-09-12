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
        "flex flex-col items-center gap-1.5 rounded-xl p-2 transition-colors",
        isCurrentTurn && "bg-accent/10 ring-1 ring-accent/40",
      )}
    >
      <div className="relative">
        <Avatar name={name} src={avatarUrl} size={40} />
        {isCurrentTurn && <span className="absolute -inset-1 -z-10 animate-pulse-ring rounded-full" />}
      </div>
      <p className="max-w-[80px] truncate text-xs font-medium text-text-dim">{name}</p>

      <div className="flex -space-x-6">
        {Array.from({ length: Math.min(cardCount, 6) }, (_, i) => (
          <CardFace key={i} faceDown size="sm" className="!w-8 !h-11" />
        ))}
      </div>
      <p className="text-[11px] text-text-faint">{cardCount} cartas</p>

      {exposedToUnoChallenge && (
        <Button size="sm" variant="danger" onClick={onChallenge} className="mt-1 gap-1 text-xs">
          <AlertTriangle className="size-3" /> ¡No cantó UNO!
        </Button>
      )}
    </div>
  );
}
