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

/**
 * Figuras propias para sota/caballo/rey — siluetas completas (no un simple
 * ícono chico) pensadas para ocupar el medallón central de la carta, en el
 * mismo espíritu que un naipe español tradicional: rey coronado, caballo
 * con jinete, sota de pie con lanza. Dibujadas desde cero, sin calcar la
 * ilustración de ningún mazo comercial.
 */
function FaceIllustration({ value, className }: { value: "10" | "11" | "12"; className?: string }) {
  if (value === "12") {
    // Rey: corona, busto con manto y cetro.
    return (
      <svg viewBox="0 0 40 56" className={className} fill="currentColor">
        <path d="M12 30c0-8 3.6-13 8-13s8 5 8 13v3H12v-3Z" />
        <path d="M9 33h22l1.4 13c.3 3-1.9 5.5-4.9 5.5H12.5c-3 0-5.2-2.5-4.9-5.5L9 33Z" />
        <circle cx="20" cy="13.5" r="6" />
        <path d="M12.5 8.5 15 13l1.5-6.5L20 11l3.5-4.5L25 13l2.5-4.5-1 8h-13l-1-8Z" />
        <circle cx="12.5" cy="8.5" r="1.4" />
        <circle cx="20" cy="6.5" r="1.4" />
        <circle cx="27.5" cy="8.5" r="1.4" />
        <rect x="28.5" y="30" width="2.2" height="16" rx="1.1" />
        <circle cx="29.6" cy="28.5" r="2.4" />
      </svg>
    );
  }

  if (value === "11") {
    // Caballo: cabeza de caballo de perfil, mirando a la derecha —
    // silueta simple de líneas rectas, en el espíritu de una pieza de
    // ajedrez (forma genérica de dominio público, no un mazo puntual).
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M9 22 9 10 8 9 11 6 10 2 12 3 13 5 17 6 19 8 18 9.5 15 10 14 13 13 22Z" />
        <path d="M9 11 6.5 11.8 9 13Z" fillOpacity="0.85" />
        <path d="M9 14.5 6.5 15.3 9 16.5Z" fillOpacity="0.85" />
        <circle cx="17.3" cy="7.8" r="0.8" fillOpacity="0.6" />
      </svg>
    );
  }

  // Sota: figura de pie con lanza y estandarte — pictograma simple.
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <circle cx="10" cy="4.2" r="2.6" />
      <path d="M6.5 8 13.5 8 14.8 18 5.2 18Z" />
      <rect x="6.3" y="18" width="2.2" height="5" rx="1" />
      <rect x="11.5" y="18" width="2.2" height="5" rx="1" />
      <rect x="16" y="1" width="1.6" height="20" rx="0.8" />
      <path d="M17.6 1 23 4 17.6 7Z" />
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
        "relative overflow-hidden rounded-xl border-2 bg-[#f7ecd4] font-display shadow-card transition-transform duration-150",
        SUIT_COLOR[card.suit],
        highlight ? "-translate-y-2 border-gold ring-2 ring-gold" : "border-black/20",
        onClick && !disabled && "hover:-translate-y-1 cursor-pointer",
        disabled && "opacity-40",
        className,
      )}
    >
      {/* Marco interior fino, como el filete impreso de un naipe real. */}
      <div className="pointer-events-none absolute inset-[6%] rounded-[0.4rem] border" style={{ borderColor: "currentColor", opacity: 0.35 }} />

      <CornerIndex card={card} className="left-[8%] top-[6%]" />
      <CornerIndex card={card} className="bottom-[6%] right-[8%] rotate-180" />

      {isFace ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-[18%]">
          <div className="relative flex aspect-[10/14] w-[62%] items-center justify-center rounded-t-full rounded-b-md border-2" style={{ borderColor: "currentColor", opacity: 0.9 }}>
            <FaceIllustration value={card.value as "10" | "11" | "12"} className="h-[86%] w-[86%] opacity-90" />
          </div>
          <span className="text-[0.6em] font-black leading-none opacity-80">{FACE_LETTER[card.value]}</span>
        </div>
      ) : (
        <PipGrid card={card} />
      )}
    </Component>
  );
}
