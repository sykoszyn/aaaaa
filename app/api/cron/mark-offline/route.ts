import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reaps stale online status left over from crashed tabs (a clean tab close
 * fires useOnlineHeartbeat's unmount handler and sets is_online=false
 * itself — this is only for the sessions that never got the chance to).
 *
 * This is NOT what makes "jugadores online" correct — every query that
 * counts online players (lib/rooms/queries.ts's countOnlinePlayers/
 * getOnlineFriends, and the admin/marketing pages) filters on a recent
 * last_seen_at itself, so a stale is_online=true row is already ignored
 * everywhere before this ever runs. This route just tidies up the column
 * in the DB periodically. Vercel's Hobby plan only allows daily cron
 * schedules (see vercel.json) — that's plenty for cleanup, no need for
 * Pro just for this.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const staleBefore = new Date(Date.now() - 60_000).toISOString();

  const { error, count } = await supabase
    .from("profiles")
    .update({ is_online: false }, { count: "exact" })
    .eq("is_online", true)
    .lt("last_seen_at", staleBefore);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ markedOffline: count ?? 0 });
}
