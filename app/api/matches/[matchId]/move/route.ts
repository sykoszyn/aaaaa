import { NextResponse } from "next/server";
import { z } from "zod";
import { applyPlayerMove } from "@/lib/games/core/engine";
import { requireProfile } from "@/lib/auth/session";

const moveSchema = z.object({
  type: z.string().min(1),
  payload: z.unknown(),
});

/**
 * Único endpoint de escritura para los 5 juegos: el cliente nunca manda un
 * "nuevo estado", solo la acción que quiere intentar. El motor
 * (lib/games/core/engine.ts) es quien decide si es legal — incluida la
 * ubicación del asiento del jugador, para no duplicar acá el SELECT que el
 * motor ya hace de la partida completa.
 */
export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const profile = await requireProfile().catch(() => null);
  if (!profile) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = moveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Movimiento inválido" }, { status: 400 });

  const result = await applyPlayerMove(matchId, profile.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // Devolvemos la vista ya calculada del propio asiento para que el cliente
  // pinte de una el resultado del movimiento (y de la cadena de bots que
  // pueda haber corrido en el medio) sin esperar un refetch aparte por
  // Realtime — ese viaje de ida y vuelta extra era la principal causa de
  // lag percibido en el tablero.
  return NextResponse.json({ finished: result.data.finished, state: result.data.view });
}
