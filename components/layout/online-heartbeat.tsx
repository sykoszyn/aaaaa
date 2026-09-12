"use client";

import { useOnlineHeartbeat } from "@/hooks/use-online-heartbeat";

/** Client leaf with zero output — just runs the heartbeat effect inside the
 * (mostly Server Component) platform layout. */
export function OnlineHeartbeat() {
  useOnlineHeartbeat();
  return null;
}
