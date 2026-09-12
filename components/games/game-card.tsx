import { Bot, Lock, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import type { GameSlug } from "@/types/database";

const GAME_GRADIENTS: Record<GameSlug, string> = {
  uno: "from-rose to-gold",
  truco: "from-cyan to-accent",
  pool: "from-success to-cyan",
  bowling: "from-gold to-rose",
  ludo: "from-accent to-rose",
};

interface GameCardProps {
  slug: GameSlug;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  supportsBots: boolean;
  implemented: boolean;
  activePlayers?: number;
}

export function GameCard({ slug, name, minPlayers, maxPlayers, supportsBots, implemented, activePlayers = 0 }: GameCardProps) {
  const content = (
    <div
      className={cn(
        "group relative flex h-40 flex-col justify-between overflow-hidden rounded-2xl border border-border p-4 transition-transform duration-200",
        implemented ? "hover:-translate-y-1 hover:border-border-strong" : "opacity-70",
      )}
    >
      <div className={cn("absolute inset-0 -z-10 bg-gradient-to-br opacity-20", GAME_GRADIENTS[slug])} />
      <div className="absolute inset-0 -z-10 bg-surface-3" />

      <div className="flex items-start justify-between">
        <h3 className="font-display text-lg font-bold text-text">{name}</h3>
        {!implemented && (
          <Badge variant="neutral" className="gap-1">
            <Lock className="size-3" /> Próximamente
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-text-dim">
        <span className="flex items-center gap-1">
          <Users className="size-3.5" />
          {minPlayers === maxPlayers ? minPlayers : `${minPlayers}-${maxPlayers}`} jugadores
        </span>
        {supportsBots && (
          <span className="flex items-center gap-1">
            <Bot className="size-3.5" /> vs bots
          </span>
        )}
        {implemented && activePlayers > 0 && (
          <Badge variant="live" className="gap-1">
            <span className="size-1.5 rounded-full bg-success" /> {activePlayers} jugando
          </Badge>
        )}
      </div>
    </div>
  );

  if (!implemented) return content;

  return <Link href={`/games/${slug}`}>{content}</Link>;
}
