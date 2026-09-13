import type { CSSProperties } from "react";
import type { TrucoSuit } from "@/lib/games/truco";

interface SuitIconProps {
  suit: TrucoSuit;
  className?: string;
  style?: CSSProperties;
}

/** Tinta de contorno — un negro cálido, no un negro puro, como la tinta
 * de un naipe impreso viejo en vez de un ícono digital plano. */
const INK = "#241407";

/** Un color de "tinta" fijo por palo (no ligado al esquema de acentos de la
 * app) + contorno negro — es lo que separa a un naipe de un ícono plano:
 * oro dorado, copa roja, espada gris acero, basto marrón madera. */
const FILL: Record<TrucoSuit, string> = {
  oro: "#dba616",
  copa: "#b23a3a",
  espada: "#7c8791",
  basto: "#8a5a2e",
};

/**
 * Íconos propios para los 4 palos españoles, con contorno + relleno de
 * color (no un solo color plano) para que se lean como un naipe impreso y
 * no como un ícono de interfaz. Formas sólidas y sin detalle fino a
 * propósito: este mismo ícono se usa tanto grande (centro de la carta)
 * como diminuto (índice de esquina). Iconografía genérica de oro/copa/
 * espada/basto, de dominio público — ninguna forma acá calca la
 * ilustración de un mazo comercial puntual.
 */
export function SuitIcon({ suit, className, style }: SuitIconProps) {
  const fill = FILL[suit];
  const sw = 1.3;

  switch (suit) {
    case "oro":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style}>
          <circle cx="12" cy="12" r="9.5" fill={fill} stroke={INK} strokeWidth={sw} />
          <circle cx="12" cy="12" r="6" fill="none" stroke={INK} strokeWidth={sw * 0.8} strokeOpacity="0.55" />
          <circle cx="12" cy="12" r="2.6" fill={INK} fillOpacity="0.55" />
        </svg>
      );
    case "copa":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style}>
          <path
            d="M5 3h14l-1 6.5C17.4 13 15 15.3 12 15.3S6.6 13 6 9.5L5 3Z"
            fill={fill}
            stroke={INK}
            strokeWidth={sw}
            strokeLinejoin="round"
          />
          <rect x="10.6" y="15" width="2.8" height="5" fill={fill} stroke={INK} strokeWidth={sw} />
          <rect x="7.3" y="19.5" width="9.4" height="2.2" rx="1" fill={fill} stroke={INK} strokeWidth={sw} />
        </svg>
      );
    case "espada":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style}>
          <path d="M12 1 14.5 4.5 13.2 17 10.8 17 9.5 4.5Z" fill={fill} stroke={INK} strokeWidth={sw} strokeLinejoin="round" />
          <line x1="12" y1="4" x2="12" y2="15.5" stroke={INK} strokeOpacity="0.35" strokeWidth="0.7" />
          <rect x="5.3" y="16.8" width="13.4" height="2.4" rx="1" fill="#c9a54a" stroke={INK} strokeWidth={sw} />
          <rect x="10.3" y="19.4" width="3.4" height="4.4" rx="1.4" fill="#c9a54a" stroke={INK} strokeWidth={sw} />
        </svg>
      );
    case "basto":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style}>
          <rect x="10" y="1" width="4" height="9" rx="1.8" fill={fill} stroke={INK} strokeWidth={sw} />
          <rect x="7.2" y="8.5" width="9.6" height="14" rx="4.2" fill={fill} stroke={INK} strokeWidth={sw} />
          <ellipse cx="10.5" cy="13.5" rx="1.1" ry="1.5" fill={INK} fillOpacity="0.3" />
          <ellipse cx="14" cy="18" rx="1.1" ry="1.5" fill={INK} fillOpacity="0.3" />
        </svg>
      );
  }
}

export const SUIT_COLOR: Record<TrucoSuit, string> = {
  oro: "text-gold",
  copa: "text-rose",
  espada: "text-cyan",
  basto: "text-success",
};

export const SUIT_LABEL: Record<TrucoSuit, string> = {
  oro: "oro",
  copa: "copa",
  espada: "espada",
  basto: "basto",
};
