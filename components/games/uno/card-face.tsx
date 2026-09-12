import { Ban, RotateCw } from "lucide-react";
import { cn } from "@/utils/cn";
import type { UnoCard, UnoColor } from "@/lib/games/uno";

const COLOR_STYLES: Record<UnoColor, string> = {
  red: "bg-[#e33] text-white",
  yellow: "bg-[#eab308] text-black",
  green: "bg-[#22b455] text-white",
  blue: "bg-[#3b82f6] text-white",
};

function symbolFor(card: UnoCard) {
  switch (card.value) {
    case "skip": return <Ban className="size-[42%]" strokeWidth={3} />;
    case "reverse": return <RotateCw className="size-[42%]" strokeWidth={3} />;
    case "draw2": return <span className="flex items-center text-[0.85em] font-black">+2</span>;
    case "wild4": return <span className="flex items-center text-[0.75em] font-black">+4</span>;
    case "wild": return null;
    default: return <span className="font-black">{card.value}</span>;
  }
}

interface CardFaceProps {
  card?: UnoCard;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

const SIZES = { sm: "w-10 h-14 text-sm", md: "w-14 h-20 text-lg", lg: "w-20 h-28 text-2xl" };

export function CardFace({ card, faceDown, size = "md", selected, disabled, onClick, className }: CardFaceProps) {
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
          <span className="font-display text-[0.6em] font-black italic text-text-faint">JA</span>
        </div>
      </div>
    );
  }

  const isWild = card.color === "wild";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={cn(
        SIZES[size],
        "relative flex items-center justify-center rounded-lg border-2 font-display shadow-card transition-transform duration-150",
        isWild
          ? "bg-gradient-to-br from-[#e33] via-[#eab308] via-[#22b455] to-[#3b82f6] text-white"
          : COLOR_STYLES[card.color as UnoColor],
        selected ? "-translate-y-2 border-gold ring-2 ring-gold" : "border-white/20",
        onClick && !disabled && "hover:-translate-y-1 cursor-pointer",
        disabled && "opacity-40",
        className,
      )}
    >
      {isWild && card.value === "wild" ? (
        <span className="rounded-full bg-black/30 px-2 py-0.5 text-[0.5em] font-black">WILD</span>
      ) : (
        symbolFor(card)
      )}
    </button>
  );
}
