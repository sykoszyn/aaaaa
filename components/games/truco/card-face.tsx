import { cn } from "@/utils/cn";
import type { TrucoCard } from "@/lib/games/truco";
import { SUIT_COLOR, SuitIcon } from "@/components/games/truco/suit-icon";

const VALUE_LABEL: Record<TrucoCard["value"], string> = {
  "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7",
  "10": "10", "11": "11", "12": "12",
};

const FACE_LETTER: Record<string, string> = { "10": "S", "11": "C", "12": "R" };

/**
 * Layout de pips genérico (posiciones propias, no calcadas de ningún mazo
 * comercial) — igual que un mazo francés estándar reparte los símbolos
 * según la cantidad, pero acá con los 4 palos españoles.
 */
const PIP_POSITIONS: Record<string, { x: number; y: number; rotate?: number }[]> = {
  "1": [{ x: 50, y: 50 }],
  "2": [{ x: 50, y: 22 }, { x: 50, y: 78, rotate: 180 }],
  "3": [{ x: 50, y: 16 }, { x: 50, y: 50 }, { x: 50, y: 84, rotate: 180 }],
  "4": [
    { x: 28, y: 22 }, { x: 72, y: 22 },
    { x: 28, y: 78, rotate: 180 }, { x: 72, y: 78, rotate: 180 },
  ],
  "5": [
    { x: 28, y: 22 }, { x: 72, y: 22 },
    { x: 50, y: 50 },
    { x: 28, y: 78, rotate: 180 }, { x: 72, y: 78, rotate: 180 },
  ],
  "6": [
    { x: 28, y: 18 }, { x: 72, y: 18 },
    { x: 28, y: 50 }, { x: 72, y: 50 },
    { x: 28, y: 82, rotate: 180 }, { x: 72, y: 82, rotate: 180 },
  ],
  "7": [
    { x: 28, y: 16 }, { x: 72, y: 16 },
    { x: 50, y: 34 },
    { x: 28, y: 50 }, { x: 72, y: 50 },
    { x: 28, y: 84, rotate: 180 }, { x: 72, y: 84, rotate: 180 },
  ],
};

/** Ícono propio y genérico por figura — silueta simple, no una ilustración
 * calcada de ningún mazo específico. */
function FaceIcon({ value, className }: { value: "10" | "11" | "12"; className?: string }) {
  if (value === "12") {
    // Rey — corona
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M3 18h18l1-9-4.5 3.5L12 6 6.5 12.5 2 9l1 9Z" />
        <rect x="3" y="19" width="18" height="2.4" rx="1" />
      </svg>
    );
  }
  if (value === "11") {
    // Caballo — cabeza de caballo estilizada
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M7 21c0-4 1-6 1-9 0-4.5 3-8 7-8 2 0 3 1.3 3 3 0 1.4-.8 2-1.8 2.6 1.4.5 2.8 1.7 2.8 3.9 0 2-1.4 3-3 3.5.6.9 1 2.2 1 4H14c0-1.7-.6-2.8-1.6-3.5-.5.2-1 .3-1.6.3-.6 2-.8 2.2-.8 3.2H7Z" />
        <circle cx="15.2" cy="7.2" r="1" fill="var(--color-surface)" />
      </svg>
    );
  }
  // Sota — figura con bastón/estandarte
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <circle cx="12" cy="5.5" r="2.5" />
      <path d="M12 9c-2.8 0-4.5 1.8-4.5 4.2V21h2.4v-6.4c0-.5.3-.8.8-.9v7.3h2.6v-7.3c.5.1.8.4.8.9V21h2.4v-7.8C16.5 10.8 14.8 9 12 9Z" />
      <rect x="16.4" y="7" width="1.6" height="10" rx="0.6" />
    </svg>
  );
}

function PipGrid({ card }: { card: TrucoCard }) {
  const positions = PIP_POSITIONS[card.value];
  if (!positions) return null;

  return (
    <div className="absolute inset-[10%]">
      {positions.map((pos, i) => (
        <SuitIcon
          key={i}
          suit={card.suit}
          className="absolute size-[26%]"
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: `translate(-50%, -50%) rotate(${pos.rotate ?? 0}deg)` }}
        />
      ))}
    </div>
  );
}

function CornerIndex({ card, className }: { card: TrucoCard; className?: string }) {
  return (
    <span className={cn("absolute flex flex-col items-center gap-0.5 text-[0.42em] font-black leading-none", className)}>
      {FACE_LETTER[card.value] ?? VALUE_LABEL[card.value]}
      <SuitIcon suit={card.suit} className="size-[0.85em]" />
    </span>
  );
}

interface CardFaceProps {
  card?: TrucoCard;
  faceDown?: boolean;
  size?: "sm" | "md" | "lg";
  highlight?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Misma lógica que el CardFace de UNO: se agranda con el breakpoint,
 * sobre todo en "md" (mano) y "lg" (bazas jugadas / carta central). */
const SIZES = {
  sm: "w-12 h-16 sm:w-14 sm:h-20",
  md: "w-20 h-28 sm:w-24 sm:h-32 md:w-28 md:h-40",
  lg: "w-24 h-32 sm:w-28 sm:h-40 md:w-32 md:h-44",
};

export function CardFace({ card, faceDown, size = "md", highlight, disabled, onClick, className }: CardFaceProps) {
  if (faceDown || !card) {
    return (
      <div
        className={cn(
          SIZES[size],
          "relative overflow-hidden rounded-xl border-2 border-white/10 bg-gradient-to-br from-surface-3 to-ink shadow-card",
          className,
        )}
      >
        <div
          className="absolute inset-1.5 rounded-lg border-2 border-white/10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(139,92,246,0.18) 0 6px, transparent 6px 14px)",
          }}
        />
        <div className="relative flex h-full items-center justify-center">
          <span className="font-display text-[0.55em] font-black italic text-text-faint">JA</span>
        </div>
      </div>
    );
  }

  const isFace = card.value === "10" || card.value === "11" || card.value === "12";
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        SIZES[size],
        "relative overflow-hidden rounded-xl border-2 bg-[#f5ecd7] font-display shadow-card transition-transform duration-150",
        SUIT_COLOR[card.suit],
        highlight ? "-translate-y-2 border-gold ring-2 ring-gold" : "border-black/15",
        onClick && !disabled && "hover:-translate-y-1 cursor-pointer",
        disabled && "opacity-40",
        className,
      )}
    >
      <CornerIndex card={card} className="left-[8%] top-[6%]" />
      <CornerIndex card={card} className="bottom-[6%] right-[8%] rotate-180" />

      {isFace ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <FaceIcon value={card.value as "10" | "11" | "12"} className="size-[42%]" />
          <span className="text-[0.7em] font-black leading-none">{FACE_LETTER[card.value]}</span>
        </div>
      ) : (
        <PipGrid card={card} />
      )}
    </Component>
  );
}
