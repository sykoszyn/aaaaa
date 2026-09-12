"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import type { Database } from "@/types/database";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

const LABELS: Record<Notification["type"], string> = {
  friend_request: "te envió una solicitud de amistad",
  friend_accepted: "aceptó tu solicitud de amistad",
  room_invite: "te invitó a una sala",
  match_found: "encontramos una partida para vos",
  achievement_unlocked: "desbloqueaste un logro",
  level_up: "subiste de nivel",
  system: "",
};

export function NotificationsBell({ profileId, initial }: { profileId: string; initial: Notification[] }) {
  const { notifications, unreadCount, markAllRead } = useNotifications(profileId, initial);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setOpen((v) => !v);
          if (!open && unreadCount > 0) void markAllRead();
        }}
        aria-label="Notificaciones"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-rose" />
        )}
      </Button>

      {open && (
        <div className="glass absolute right-0 top-12 z-50 w-80 rounded-xl border border-border-strong p-2 shadow-card">
          {notifications.length === 0 ? (
            <EmptyState icon={Bell} title="Sin notificaciones" description="Te avisamos acá cuando pase algo." />
          ) : (
            <ul className="max-h-96 overflow-y-auto scrollbar-thin">
              {notifications.slice(0, 20).map((n) => (
                <li key={n.id} className="rounded-lg px-3 py-2 text-sm hover:bg-surface-3">
                  <p className="text-text-dim">{LABELS[n.type] || "Nueva notificación"}</p>
                  <p className="mt-0.5 text-xs text-text-faint">{new Date(n.created_at).toLocaleString("es-AR")}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
