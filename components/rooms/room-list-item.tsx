import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoomListItemProps {
  code: string;
  gameName: string;
  playerCount: number;
  maxPlayers: number;
  onJoin: () => void;
}

export function RoomListItem({ code, gameName, playerCount, maxPlayers, onJoin }: RoomListItemProps) {
  const full = playerCount >= maxPlayers;

  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-surface-3/40 px-3 py-2.5">
      <div>
        <p className="text-sm font-medium text-text">{gameName}</p>
        <p className="flex items-center gap-1 text-xs text-text-faint">
          <Users className="size-3" /> {playerCount}/{maxPlayers} · código {code}
        </p>
      </div>
      <Button size="sm" variant="secondary" onClick={onJoin} disabled={full}>
        {full ? "Llena" : "Unirme"}
      </Button>
    </div>
  );
}
