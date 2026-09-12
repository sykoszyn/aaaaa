import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

const badgeVariants = cva("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", {
  variants: {
    variant: {
      neutral: "bg-surface-3 text-text-dim",
      accent: "bg-accent/15 text-accent-hover",
      success: "bg-success/15 text-success",
      gold: "bg-gold/15 text-gold",
      danger: "bg-danger/15 text-danger",
      live: "bg-success/15 text-success",
    },
  },
  defaultVariants: { variant: "neutral" },
});

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
