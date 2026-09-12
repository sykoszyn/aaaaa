import { TrucoTable } from "@/components/games/truco/truco-table";
import { UnoTable } from "@/components/games/uno/uno-table";
import type { TrucoPlayerView } from "@/lib/games/truco";
import type { UnoPlayerView } from "@/lib/games/uno";
import type { GameSlug } from "@/types/database";

interface SeatInfo {
  seat: number;
  name: string;
  avatarUrl: string | null;
  isBot: boolean;
}

interface GameBoardProps {
  gameSlug: GameSlug;
  matchId: string;
  roomId: string;
  seat: number;
  initialView: unknown;
  players: SeatInfo[];
}

/**
 * The one place that maps a game slug to its board component. Adding a new
 * game's UI means adding one case here — everything upstream (the room
 * page, the move/state API, the engine) is already generic.
 */
export function GameBoard({ gameSlug, matchId, roomId, seat, initialView, players }: GameBoardProps) {
  switch (gameSlug) {
    case "uno":
      return (
        <UnoTable
          matchId={matchId}
          roomId={roomId}
          seat={seat}
          initialView={initialView as UnoPlayerView}
          players={players}
        />
      );
    case "truco":
      return (
        <TrucoTable
          matchId={matchId}
          roomId={roomId}
          seat={seat}
          initialView={initialView as TrucoPlayerView}
          players={players}
        />
      );
    default:
      return (
        <p className="text-text-dim">
          Este juego todavía no tiene una interfaz de partida implementada.
        </p>
      );
  }
}
