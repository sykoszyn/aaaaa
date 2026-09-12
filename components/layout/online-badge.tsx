"use client";

import { useOnlineCount } from "@/hooks/use-online-count";

export function OnlineBadge({ initialCount }: { initialCount: number }) {
  const count = useOnlineCount(initialCount);

  return (
    <div className="flex items-center gap-2 rounded-full border border-border-strong bg-surface-3/60 px-3 py-1.5 text-xs font-medium text-text-dim">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full rounded-full bg-success animate-pulse-ring" />
        <span className="relative inline-flex size-2 rounded-full bg-success" />
      </span>
      {count.toLocaleString("es-AR")} jugando ahora
    </div>
  );
}
