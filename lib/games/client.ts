"use client";

/**
 * Single client-side helper for sending a move to ANY game — mirrors the
 * single server-side write path in lib/games/core/engine.ts. A game's UI
 * never talks to Supabase directly for match state, only to this endpoint.
 */
export async function postMove(matchId: string, type: string, payload: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(`/api/matches/${matchId}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body.error ?? "No se pudo enviar el movimiento" };
  return { ok: true };
}
