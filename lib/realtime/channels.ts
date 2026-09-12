/**
 * Canonical channel/topic names — every producer and consumer of Supabase
 * Realtime imports these instead of hand-typing strings, so a rename never
 * silently desyncs a publisher from its subscribers.
 */
export const roomChannel = (roomId: string) => `room:${roomId}`;
export const matchChannel = (matchId: string) => `game:${matchId}`;
export const roomPresenceChannel = (roomId: string) => `presence:${roomId}`;

/**
 * IMPORTANT — why match state is never streamed raw:
 *
 * `game_matches.state` and `game_events.payload` can legally contain
 * information the OTHER seats must not see yet (opponents' hands in UNO,
 * a face-down card, the undrawn deck order). Supabase Realtime's
 * postgres_changes enforces the row's RLS SELECT policy, but RLS is an
 * all-or-nothing row filter — it can't redact individual jsonb keys per
 * viewer. GameDefinition.toPlayerView() does that redaction, but only the
 * server (lib/games/core/engine.ts, via the service-role client) ever
 * calls it.
 *
 * So `hooks/use-match-state.ts` subscribes to game_matches/game_events
 * purely as a "something changed, go refetch" signal and always re-reads
 * the actual state through GET /api/matches/[matchId], which runs
 * toPlayerView() server-side for the requesting player's seat. Never wire
 * a game's UI directly off the realtime payload's `new.state`.
 */
