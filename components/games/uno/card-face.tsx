"use client";

import { Ban, Repeat } from "lucide-react";
import { cn } from "@/utils/cn";
import type { UnoCard, UnoColor } from "@/lib/games/uno";

/** Colores de fondo por palo — tonos saturados clásicos de UNO, dibujados
 * con nuestro propio óvalo/tipografía (no assets ni logo originales). */
const BG_COLOR: Record<UnoColor, string> = {
  red: "#E52521",
  yellow: "#FFC90D",
  green: "#17A652",
  blue: "#0B63B0",
};

const WILD_QUADRANTS: UnoColor[] = ["red", "yellow", "green", "blue"];

function CenterMark({ card }: { card: UnoCard }) {
  // Ojo: acá tiene que ser em, no % — el div que rota este ícono no tiene
  // una altura propia explícita, así que un alto/ancho en % nunca se
  // resuelve contra el tamaño real de la carta y el ícono queda pegado al
  // tamaño por defecto de lucide (24px) sin importar cuánto crezca la carta.
  if (card.value === "skip") return <Ban className="h-[1.9em] w-[1.9em]" strokeWidth={3.5} />;
  if (card.value === "reverse") return <Repeat className="h-[1.75em] w-[1.75em]" strokeWidth={3.5} />;
  if (card.value === "draw2") return <span className="text-[0.95em] font-black leading-none">+2</span>;
  if (card.value === "wild4") return <span className="text-[0.85em] font-black leading-none">+4</span>;
  return <span className="text-[1.5em] font-black italic leading-none">{card.value}</span>;
}

function CornerMark({ card, className }: { card: UnoCard; className?: string }) {
  const label =
    card.value === "skip" ? (
      <Ban className="size-[0.9em]" strokeWidth={3.5} />
    ) : card.value === "reverse" ? (
      <Repeat className="size-[0.9em]" strokeWidth={3.5} />
    ) : card.value === "draw2" ? (
      "+2"
    ) : card.value === "wild4" ? (
      "+4"
    ) : (
      card.value
    );

  return (
    <span className={cn("absolute flex items-center justify-center text-[0.32em] font-black italic text-white drop-shadow-sm", className)}>
      {label}
    </span>
  );
}

function WildPinwheel() {
  return (
    <svg viewBox="0 0 100 100" className="h-[70%] w-[70%]" aria-hidden>
      {WILD_QUADRANTS.map((color, i) => {
        const start = i * 90 - 45;
        const end = start + 90;
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const x1 = 50 + 48 * Math.cos(toRad(start));
        const y1 = 50 + 48 * Math.sin(toRad(start));
        const x2 = 50 + 48 * Math.cos(toRad(end));
        const y2 = 50 + 48 * Math.sin(toRad(end));
        return <path key={color} d={`M50,50 L${x1},${y1} A48,48 0 0,1 ${x2},${y2} Z`} fill={BG_COLOR[color]} />;
      })}
      <circle cx="50" cy="50" r="14" fill="#0c0c14" />
    </svg>
  );
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

/** Tamaños en escala ~2.5:3.5 (proporción real de carta), crecientes por
 * breakpoint — la mano y el centro de juego son los que más se agrandan,
 * que es donde más se notaba que las cartas quedaban chicas para jugar. */
const SIZES = {
  sm: "w-12 h-16 text-sm sm:w-14 sm:h-20 sm:text-base",
  md: "w-20 h-28 text-xl sm:w-24 sm:h-32 sm:text-2xl md:w-28 md:h-40 md:text-3xl",
  lg: "w-28 h-40 text-2xl sm:w-32 sm:h-44 sm:text-3xl md:w-36 md:h-52 md:text-4xl",
};

export function CardFace({ card, faceDown, size = "md", selected, disabled, onClick, className }: CardFaceProps) {
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
        "relative overflow-hidden rounded-xl border-2 border-black/40 font-display text-white shadow-card transition-transform duration-150",
        selected ? "-translate-y-2 border-gold ring-2 ring-gold" : "",
        onClick && !disabled && "hover:-translate-y-1 cursor-pointer",
        disabled && "opacity-40",
        className,
      )}
      style={{ backgroundColor: isWild ? "#0c0c14" : BG_COLOR[card.color as UnoColor] }}
    >
      {!isWild && (
        <>
          <CornerMark card={card} className="left-[10%] top-[8%]" />
          <CornerMark card={card} className="bottom-[8%] right-[10%] rotate-180" />
        </>
      )}

      <div className="absolute inset-0 flex items-center justify-center">
        {isWild ? (
          card.value === "wild4" ? (
            <div className="relative flex h-full w-full items-center justify-center">
              <WildPinwheel />
              <span className="absolute text-[0.85em] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">+4</span>
            </div>
          ) : (
            <WildPinwheel />
          )
        ) : (
          <div
            className="flex aspect-[1.6/1] w-[86%] -rotate-[24deg] items-center justify-center rounded-[50%] bg-[#faf6ea]"
            style={{ color: BG_COLOR[card.color as UnoColor] }}
          >
            <div className="rotate-[24deg]">
              <CenterMark card={card} />
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
