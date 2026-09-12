"use client";

import { useEffect } from "react";
import { pingOffline, pingOnline } from "@/app/(platform)/actions";

const HEARTBEAT_MS = 25_000;

/** Mount once in the platform layout — keeps profiles.is_online accurate
 * while the user has a tab open, so "jugadores online" reflects reality. */
export function useOnlineHeartbeat() {
  useEffect(() => {
    void pingOnline();
    const interval = setInterval(() => void pingOnline(), HEARTBEAT_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void pingOnline();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void pingOffline();
    };
  }, []);
}
