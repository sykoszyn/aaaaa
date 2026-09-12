"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex items-center gap-2 rounded-xl border border-border-strong bg-surface-3/60 px-4 py-2 font-display text-xl font-bold tracking-widest text-text transition-colors hover:border-accent/60"
    >
      {code}
      {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4 text-text-faint" />}
    </button>
  );
}
