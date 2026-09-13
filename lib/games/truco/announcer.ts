import { teamOf } from "./rules";
import type { TrucoMovePayload, TrucoPlayerView } from "./types";

const ENVIDO_CALL_PHRASE: Record<string, string> = {
  envido: "¡Envido!",
  real_envido: "¡Real envido!",
  falta_envido: "¡Falta envido!",
};

const TRUCO_CALL_PHRASE: Record<string, string> = {
  truco: "¡Truco!",
  retruco: "¡Retruco!",
  vale_cuatro: "¡Vale cuatro!",
};

interface AnnounceMove {
  seat: number;
  type: string;
  payload: TrucoMovePayload;
}

/**
 * Frases para cantar en voz alta cada paso de la partida — lo que se
 * "canta" (envido/truco/flor/quiero/no quiero) y, apenas se revela, quién
 * ganó el envido/flor o la mano, para que no haga falta estar mirando el
 * cartel de resultado para enterarse. `prev`/`next` son la vista del mismo
 * asiento antes y después de este paso — se compara para no repetir un
 * resultado que ya se había anunciado en un paso anterior.
 */
export function describeTrucoStep(move: AnnounceMove, prev: TrucoPlayerView, next: TrucoPlayerView): string[] {
  const phrases: string[] = [];
  const actingTeam = teamOf(move.seat, next.playerCount);
  const mine = actingTeam === next.myTeam;

  switch (move.payload.type) {
    case "call_envido":
      phrases.push(ENVIDO_CALL_PHRASE[move.payload.level]);
      break;
    case "call_truco":
      phrases.push(TRUCO_CALL_PHRASE[move.payload.level]);
      break;
    case "declare_flor":
      phrases.push("¡Flor!");
      break;
    case "go_to_deck":
      phrases.push(mine ? "Me voy al mazo" : "Se va al mazo");
      break;
    case "respond_bid":
      phrases.push(move.payload.accept ? "¡Quiero!" : "No quiero");
      break;
  }

  if (!prev.envido.resolved && next.envido.resolved && next.envido.winnerTeam !== null) {
    const won = next.envido.winnerTeam === next.myTeam;
    phrases.push(won ? `Ganamos el envido, ${next.envido.pointsAwarded} puntos` : `Ganan el envido, ${next.envido.pointsAwarded} puntos`);
  }

  if (!prev.flor.resolved && next.flor.resolved && next.flor.winnerTeam !== null) {
    const won = next.flor.winnerTeam === next.myTeam;
    phrases.push(won ? `Nuestra flor vale ${next.flor.pointsAwarded}` : `Su flor vale ${next.flor.pointsAwarded}`);
  }

  if (next.lastHandSummary && next.lastHandSummary.handNumber !== prev.lastHandSummary?.handNumber) {
    const truco = next.lastHandSummary.truco;
    if (truco) {
      const won = truco.team === next.myTeam;
      phrases.push(won ? `Nos llevamos la mano, ${truco.points} puntos` : `Se llevan la mano, ${truco.points} puntos`);
    }
  }

  if (next.finished && !prev.finished && next.winnerTeam !== null) {
    phrases.push(next.winnerTeam === next.myTeam ? "¡Ganamos la partida!" : "Perdimos la partida");
  }

  return phrases;
}
