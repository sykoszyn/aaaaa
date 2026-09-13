"use client";

/** Un paso de la cadena de movimientos que resolvió el servidor: el
 * estado ya visto desde tu asiento, más el movimiento que lo produjo (para
 * poder anunciar qué pasó, no solo pintar el resultado). */
export interface MoveStep<TState> {
  state: TState;
  move: { seat: number; type: string; payload: unknown };
}

/**
 * Single client-side helper for sending a move to ANY game — mirrors the
 * single server-side write path in lib/games/core/engine.ts. A game's UI
 * never talks to Supabase directly for match state, only to this endpoint.
 */
export async function postMove<TState = unknown>(
  matchId: string,
  type: string,
  payload: unknown,
): Promise<{ ok: true; steps: MoveStep<TState>[]; finished: boolean } | { ok: false; error: string }> {
  const res = await fetch(`/api/matches/${matchId}/move`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body.error ?? "No se pudo enviar el movimiento" };
  const steps: MoveStep<TState>[] = (body.steps ?? []).map((s: { view: TState; move: MoveStep<TState>["move"] }) => ({
    state: s.view,
    move: s.move,
  }));
  return { ok: true, steps, finished: body.finished };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Un movimiento puede resolver en el servidor, en el mismo pedido, una
 * cadena de jugadas de bots detrás de la tuya (hasta que vuelva a ser turno
 * humano). Mostrar solo el estado final tapa tu propia jugada apenas hay
 * algún bot después — esto reproduce cada paso en pantalla en secuencia: el
 * tuyo de una, y cada uno de los bots con una pequeña pausa entre medio,
 * para que se vea cada carta que cae en vez de saltar directo al final.
 *
 * `onStep` (opcional) se llama con cada paso ANTES de pintarlo — lo usa
 * Truco para anunciar por voz qué se cantó en cada paso de la cadena.
 */
export async function playSteps<TState>(
  steps: MoveStep<TState>[],
  applyLocalState: (state: TState, finished: boolean) => void,
  finished: boolean,
  options?: { delayMs?: number; onStep?: (step: MoveStep<TState>, index: number) => void },
) {
  const delayMs = options?.delayMs ?? 550;
  for (let i = 0; i < steps.length; i++) {
    if (i > 0) await sleep(delayMs);
    options?.onStep?.(steps[i], i);
    applyLocalState(steps[i].state, i === steps.length - 1 && finished);
  }
}
