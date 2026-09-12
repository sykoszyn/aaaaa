"use server";

import { createClient } from "@/lib/supabase/server";

/** Heartbeat called every ~25s by useOnlineHeartbeat while a platform tab is open. */
export async function pingOnline() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ is_online: true, last_seen_at: new Date().toISOString() })
    .eq("id", user.id);
}

/** Best-effort — called on unmount/tab close. If it never fires (closed tab,
 * lost connection), /api/cron/mark-offline reaps stale sessions instead. */
export async function pingOffline() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("profiles").update({ is_online: false }).eq("id", user.id);
}
