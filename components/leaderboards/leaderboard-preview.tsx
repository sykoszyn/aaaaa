import { Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";

interface LeaderboardEntry {
  username: string;
  display_name: string;
  avatar_url: string | null;
  level: number;
  xp: number;
}

const MEDAL_COLORS = ["text-gold", "text-text-dim", "text-rose"];

export function LeaderboardPreview({ entries }: { entries: LeaderboardEntry[] }) {
  if (entries.length === 0) {
    return <EmptyState icon={Trophy} title="Todavía no hay ranking" description="Jugá tu primera partida para aparecer acá." />;
  }

  return (
    <ol className="flex flex-col gap-1">
      {entries.map((entry, i) => (
        <li key={entry.username} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-3/60">
          <span className={`w-5 text-center font-display text-sm font-bold ${MEDAL_COLORS[i] ?? "text-text-faint"}`}>
            {i + 1}
          </span>
          <Avatar src={entry.avatar_url} name={entry.display_name} size={32} />
          <div className="flex-1">
            <p className="text-sm font-medium text-text">{entry.display_name}</p>
            <p className="text-xs text-text-faint">Nivel {entry.level}</p>
          </div>
          <span className="text-sm font-semibold text-gold">{entry.xp.toLocaleString("es-AR")} XP</span>
        </li>
      ))}
    </ol>
  );
}
