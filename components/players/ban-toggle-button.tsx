"use client";

import { useTransition } from "react";
import { setUserBanned } from "@/app/(platform)/admin/actions";
import { Button } from "@/components/ui/button";

export function BanToggleButton({ profileId, banned }: { profileId: string; banned: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant={banned ? "secondary" : "danger"}
      disabled={pending}
      onClick={() => startTransition(() => setUserBanned(profileId, !banned))}
    >
      {banned ? "Reactivar" : "Suspender"}
    </Button>
  );
}
