import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border-strong px-6 py-10 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-surface-3 text-text-dim">
        <Icon className="size-6" />
      </div>
      <div>
        <p className="font-medium text-text">{title}</p>
        {description && <p className="mt-1 max-w-xs text-sm text-text-dim">{description}</p>}
      </div>
      {action}
    </div>
  );
}
