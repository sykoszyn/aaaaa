import { cn } from "@/utils/cn";
import type { TrucoCard } from "@/lib/games/truco";
import { SUIT_COLOR, SuitIcon } from "@/components/games/truco/suit-icon";

const VALUE_LABEL: Record<TrucoCard["value"], string> = {
  "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7",
  "10": "S", "11": "C", "12": "R",
};

interface CardFaceProps {
  card?: TrucoCard;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  highlight?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZES = { sm: "w-10 h-14", md: "w-14 h-20", lg: "w-16 h-24" };

export function CardFace({ card, faceDown, size = "md", highlight, disabled, onClick, className }: CardFaceProps) {
  if (faceDown || !card) {
    return (
      <div
        className={cn(
          SIZES[size],
          "rounded-lg border-2 border-white/10 bg-gradient-to-br from-surface-3 to-ink shadow-card",
          className,
        )}
      >
        <div className="flex h-full items-center justify-center">
          <span className="font-display text-[0.55em] font-black italic text-text-faint">JA</span>
        </div>
      </div>
    );
  }

  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        SIZES[size],
        "flex flex-col items-center justify-center gap-0.5 rounded-lg border-2 bg-[#f5ecd7] font-display shadow-card transition-transform duration-150",
        SUIT_COLOR[card.suit],
        highlight ? "-translate-y-2 border-gold ring-2 ring-gold" : "border-black/10",
        onClick && !disabled && "hover:-translate-y-1 cursor-pointer",
        disabled && "opacity-40",
        className,
      )}
    >
      <span className="text-lg font-black leading-none">{VALUE_LABEL[card.value]}</span>
      <SuitIcon suit={card.suit} className="size-[38%]" />
    </Component>
  );
}
