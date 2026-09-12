"use client";

import { useTransition } from "react";
import { respondFriendRequest } from "@/app/(platform)/friends/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface FriendRequest {
  id: string;
  profile: { username: string; display_name: string; avatar_url: string | null };
}

export function FriendRequestsList({ requests }: { requests: FriendRequest[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <ul className="flex flex-col gap-2">
      {requests.map((req) => (
        <li key={req.id} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
          <div className="flex items-center gap-2">
            <Avatar src={req.profile.avatar_url} name={req.profile.display_name} size={32} />
            <p className="text-sm font-medium text-text">{req.profile.display_name}</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => startTransition(() => respondFriendRequest(req.id, true))}>
              Aceptar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => startTransition(() => respondFriendRequest(req.id, false))}
            >
              Rechazar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
