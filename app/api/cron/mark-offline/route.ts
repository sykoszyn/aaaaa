import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Reaps stale online status. useOnlineHeartbeat's unmount handler marks a
 * user offline on a clean tab close, but a crashed tab or dropped
 * connection never fires it — so anyone whose heartbeat is older than
 * twice the client's interval gets swept here. Configured in vercel.json
 * to run every minute; no VPS/long-running process involved.
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
