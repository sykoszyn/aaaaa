import { NextResponse } from "next/server";
import { z } from "zod";
import { applyPlayerMove } from "@/lib/games/core/engine";
import { requireProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

const moveSchema = z.object({
  type: z.string().min(1),
  payload: z.unknown(),
});

/**
 * Único endpoint de escritura para los 5 juegos: el cliente nunca manda un
 * "nuevo estado", solo la acción que quiere intentar. El motor
 * (lib/games/core/engine.ts) es quien decide si es legal.
 */
export async function POST(request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const profile = await requireProfile().catch(() => null);
  if (!profile) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const parsed = moveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Movimiento inválido" }, { status: 400 });

  const supabase = createAdminClient();
  const { data: match, error } = await supabase
    .from("game_matches")
    .select("game_match_players(seat, profile_id)")
    .eq("id", matchId)
    .single();

  if (error || !match) return NextResponse.json({ error: "Partida no encontrada" }, { status: 404 });

  const seatRow = match.game_match_players.find((p) => p.profile_id === profile.id);
  if (!seatRow) return NextResponse.json({ error: "No participás de esta partida" }, { status: 403 });

  const result = await applyPlayerMove(matchId, seatRow.seat, {
    seat: seatRow.seat,
    type: parsed.data.type,
    payload: parsed.data.payload,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json(result.data);
}
