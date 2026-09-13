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

  // Devolvemos la vista de CADA paso de la cadena (tu jugada + la de cada
  // bot que haya respondido antes de que vuelva a ser tu turno), no solo la
  // final — así el cliente puede animarlas en secuencia en vez de que tu
  // propia carta quede tapada por la del último bot que jugó en el medio.
  return NextResponse.json({ finished: result.data.finished, steps: result.data.steps });
}
