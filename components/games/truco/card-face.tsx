import { cn } from "@/utils/cn";
import type { TrucoCard, TrucoSuit } from "@/lib/games/truco";
import { SUIT_COLOR, SuitIcon } from "@/components/games/truco/suit-icon";

/** Misma paleta de "tinta" que suit-icon.tsx — las figuras de las
 * cartas de figura usan estos mismos tonos por palo para el manto. */
const INK = "#241407";
const ROBE_FILL: Record<TrucoSuit, string> = {
  oro: "#dba616",
  copa: "#b23a3a",
  espada: "#7c8791",
  basto: "#8a5a2e",
};
const SKIN = "#e3b488";
const GOLD = "#e0b23a";
const HORSE_BROWN = "#7a4a26";

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
 * Figuras propias para sota/caballo/rey, con el mismo tratamiento que los
 * palos: contorno de tinta + relleno por capas (piel, oro, manto del color
 * del palo) en vez de una silueta de un solo color — así se leen como un
 * naipe grabado y no como un ícono de interfaz. Formas simples y sólidas
 * a propósito (nada de líneas finas que se pierdan chicas). Dibujadas
 * desde cero: rey coronado, cabeza de caballo de perfil, paje de pie — no
 * calcan la ilustración de ningún mazo comercial puntual.
 */
function FaceIllustration({ value, suit, className }: { value: "10" | "11" | "12"; suit: TrucoSuit; className?: string }) {
  const robe = ROBE_FILL[suit];
  const sw = 1.1;

  if (value === "12") {
    // Rey: corona dorada + cabeza + manto del color del palo.
    return (
      <svg viewBox="0 0 24 30" className={className}>
        <path d="M7.5 13 L16.5 13 L19.5 29 L4.5 29 Z" fill={robe} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
        <rect x="6.5" y="19" width="11" height="1.8" fill={INK} fillOpacity="0.25" />
        <circle cx="12" cy="9" r="3.8" fill={SKIN} stroke={INK} strokeWidth={sw} />
        <circle cx="10.6" cy="8.8" r="0.5" fill={INK} />
        <circle cx="13.4" cy="8.8" r="0.5" fill={INK} />
        <path
          d="M6.6 4.6 L7.6 1 L9.2 3.6 L10.6 0.4 L12 3 L13.4 0.4 L14.8 3.6 L16.4 1 L17.4 4.6 Z"
          fill={GOLD}
          stroke={INK}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <rect x="6.6" y="4.4" width="10.8" height="1.6" fill={GOLD} stroke={INK} strokeWidth={sw * 0.7} />
      </svg>
    );
  }

  if (value === "11") {
    // Caballo: cabeza de caballo de perfil, mirando a la derecha — forma
    // genérica en el espíritu de una pieza de ajedrez (dominio público).
    return (
      <svg viewBox="0 0 24 24" className={className}>
        <path
          d="M9 22 9 10 8 9 11 6 10 2 12 3 13 5 17 6 19 8 18 9.5 15 10 14 13 13 22Z"
          fill={HORSE_BROWN}
          stroke={INK}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
        <path d="M9 11 6.8 11.7 9 12.6Z" fill={INK} fillOpacity="0.5" />
        <path d="M9 14.2 6.8 14.9 9 15.8Z" fill={INK} fillOpacity="0.5" />
        <circle cx="17.2" cy="7.8" r="0.7" fill={INK} />
      </svg>
    );
  }

  // Sota: figura de pie, con túnica del color del palo.
  return (
    <svg viewBox="0 0 24 26" className={className}>
      <path d="M7.5 9 L16.5 9 L18 21 L6 21 Z" fill={robe} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
      <rect x="6.6" y="14" width="10.8" height="1.6" fill={INK} fillOpacity="0.25" />
      <rect x="7.6" y="21" width="3" height="5" rx="1.2" fill={HORSE_BROWN} stroke={INK} strokeWidth={sw} />
      <rect x="13.4" y="21" width="3" height="5" rx="1.2" fill={HORSE_BROWN} stroke={INK} strokeWidth={sw} />
      <circle cx="12" cy="5" r="3.8" fill={SKIN} stroke={INK} strokeWidth={sw} />
      <circle cx="10.6" cy="4.8" r="0.5" fill={INK} />
      <circle cx="13.4" cy="4.8" r="0.5" fill={INK} />
    </svg>
  );
}

function PipGrid({ card }: { card: TrucoCard }) {
  const positions = PIP_POSITIONS[card.value];
  if (!positions) return null;

  return (
    <div className="absolute inset-[9%]">
      {positions.map((pos, i) => (
        <SuitIcon
          key={i}
          suit={card.suit}
          className="absolute size-[30%]"
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: `translate(-50%, -50%) rotate(${pos.rotate ?? 0}deg)` }}
        />
      ))}
    </div>
  );
}

function CornerIndex({ card, className }: { card: TrucoCard; className?: string }) {
  return (
    <span className={cn("absolute flex flex-col items-center gap-0.5 text-[0.44em] font-black leading-none", className)}>
      {FACE_LETTER[card.value] ?? VALUE_LABEL[card.value]}
      <SuitIcon suit={card.suit} className="size-[0.95em]" />
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

/**
 * Misma lógica que el CardFace de UNO: se agranda con el breakpoint, sobre
 * todo en "md" (mano) y "lg" (bazas jugadas / carta central).
 *
 * Las clases text-* acá NO son cosméticas: el índice de esquina (número +
 * ícono de palo chico) está medido en `em`, relativo al tamaño de letra
 * heredado — sin una clase de tamaño de fuente propia en este contenedor,
 * ese `em` se resuelve contra el tamaño de letra por defecto de la página
 * (fijo, ~16px) sin importar cuánto crezca la carta, y el índice queda
 * pegado a un tamaño microscópico en vez de escalar con size/breakpoint.
 */
const SIZES = {
  sm: "w-12 h-16 text-sm sm:w-14 sm:h-20 sm:text-base",
  md: "w-20 h-28 text-xl sm:w-24 sm:h-32 sm:text-2xl md:w-28 md:h-40 md:text-3xl",
  lg: "w-24 h-32 text-2xl sm:w-28 sm:h-40 sm:text-3xl md:w-32 md:h-44 md:text-4xl",
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
        "relative overflow-hidden rounded-md border-[3px] border-[#1a0f05] bg-[#efdfba] font-display shadow-card transition-transform duration-150",
        SUIT_COLOR[card.suit],
        highlight && "-translate-y-2 ring-2 ring-gold",
        onClick && !disabled && "hover:-translate-y-1 cursor-pointer",
        disabled && "opacity-40",
        className,
      )}
    >
      {/* Doble filete, como el borde impreso de un naipe real. */}
      <div className="pointer-events-none absolute inset-[5%] border-2" style={{ borderColor: "#1a0f05", opacity: 0.75 }} />
      <div className="pointer-events-none absolute inset-[7%] border" style={{ borderColor: "currentColor", opacity: 0.5 }} />

      <CornerIndex card={card} className="left-[9%] top-[6%]" />
      <CornerIndex card={card} className="bottom-[6%] right-[9%] rotate-180" />

      {isFace ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-[14%]">
          <div className="relative flex aspect-[10/14] w-[72%] items-center justify-center rounded-t-full rounded-b-sm border-2" style={{ borderColor: "#1a0f05" }}>
            <FaceIllustration value={card.value as "10" | "11" | "12"} suit={card.suit} className="h-[92%] w-[92%]" />
          </div>
          <span className="text-[0.65em] font-black leading-none opacity-80">{FACE_LETTER[card.value]}</span>
        </div>
      ) : (
        <PipGrid card={card} />
      )}
    </Component>
  );
}
