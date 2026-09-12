import { NextResponse } from "next/server";
import { getStateForSeat } from "@/lib/games/core/engine";
import { requireProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const profile = await requireProfile().catch(() => null);
  if (!profile) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabase = createAdminClient();
  const { data: match, error } = await supabase
    .from("game_matches")
    .select("status, game_match_players(seat, profile_id)")
    .eq("id", matchId)
    .single();

  if (error || !match) return NextResponse.json({ error: "Partida no encontrada" }, { status: 404 });

  const seatRow = match.game_match_players.find((p) => p.profile_id === profile.id);
  if (!seatRow) return NextResponse.json({ error: "No participás de esta partida" }, { status: 403 });

  const result = await getStateForSeat(matchId, seatRow.seat);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ status: match.status, state: result.data, seat: seatRow.seat });
}
