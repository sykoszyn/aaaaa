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
 * Figuras propias para sota/caballo/rey — siluetas simples y sólidas
 * pensadas para ocupar el medallón central de la carta: rey coronado,
 * cabeza de caballo de perfil, paje de pie. A propósito sin detalle fino
 * (nada de líneas delgadas ni huecos chicos) porque el medallón, aunque es
 * la parte más grande de la carta, sigue siendo chico en pantalla — un
 * trazo fino ahí se pierde igual que en el índice de esquina. Dibujadas
 * desde cero, sin calcar la ilustración de ningún mazo comercial.
 */
function FaceIllustration({ value, className }: { value: "10" | "11" | "12"; className?: string }) {
  if (value === "12") {
    // Rey: corona de 3 puntas + cabeza + manto, todo en bloques sólidos.
    return (
      <svg viewBox="0 0 24 30" className={className} fill="currentColor">
        <circle cx="12" cy="9" r="3.6" />
        <rect x="7" y="4.6" width="10" height="2.4" rx="0.4" />
        <polygon points="7.4,4.6 9.6,4.6 8.5,1" />
        <polygon points="10.8,4.6 13.2,4.6 12,0" />
        <polygon points="14.4,4.6 16.6,4.6 15.5,1" />
        <path d="M7.5 13 L16.5 13 L19.5 29 L4.5 29 Z" />
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
      </svg>
    );
  }

  // Sota: figura de pie, simple y sólida — sin objetos chicos (lanza,
  // bandera) que a este tamaño terminan pareciendo otra cosa.
  return (
    <svg viewBox="0 0 24 26" className={className} fill="currentColor">
      <circle cx="12" cy="5" r="3.6" />
      <path d="M7.5 9 L16.5 9 L18 21 L6 21 Z" />
      <rect x="7.6" y="21" width="3" height="5" rx="1.2" />
      <rect x="13.4" y="21" width="3" height="5" rx="1.2" />
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-[12%]">
          <div className="relative flex aspect-[10/14] w-[74%] items-center justify-center rounded-t-full rounded-b-md border-2" style={{ borderColor: "currentColor", opacity: 0.9 }}>
            <FaceIllustration value={card.value as "10" | "11" | "12"} className="h-[88%] w-[88%]" />
          </div>
          <span className="text-[0.65em] font-black leading-none opacity-80">{FACE_LETTER[card.value]}</span>
        </div>
      ) : (
        <PipGrid card={card} />
      )}
    </Component>
  );
}
