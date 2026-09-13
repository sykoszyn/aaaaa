import type { CSSProperties } from "react";
import type { TrucoSuit } from "@/lib/games/truco";

interface SuitIconProps {
  suit: TrucoSuit;
  className?: string;
  style?: CSSProperties;
}

/**
 * Íconos propios para los 4 palos españoles — formas sólidas y sin
 * detalle fino a propósito: este mismo ícono se usa tanto grande (centro
 * de la carta) como diminuto (índice de esquina), y una línea fina o un
 * hueco pequeño se pierde por completo a ese tamaño. Iconografía genérica
 * de oro/copa/espada/basto, de dominio público — ninguna forma acá calca
 * la ilustración de un mazo comercial puntual.
 */
export function SuitIcon({ suit, className, style }: SuitIconProps) {
  switch (suit) {
    case "oro":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          <circle cx="12" cy="12" r="10" fillOpacity="0.3" />
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      );
    case "copa":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          {/* cáliz sólido: copa + base, sin asas finas que se pierdan chico */}
          <path d="M5 3h14l-1 6.5C17.4 13 15 15.3 12 15.3S6.6 13 6 9.5L5 3Z" />
          <rect x="10.6" y="15" width="2.8" height="5" />
          <rect x="7.5" y="19.5" width="9" height="2" rx="1" />
        </svg>
      );
    case "espada":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          <path d="M12 1 14.5 4.5 13.2 17 10.8 17 9.5 4.5Z" />
          <rect x="5.5" y="17" width="13" height="2.4" rx="1" />
          <rect x="10.4" y="19.6" width="3.2" height="4.4" rx="1.4" />
        </svg>
      );
    case "basto":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          {/* garrote de madera: mango fino arriba, cabeza gruesa abajo */}
          <rect x="10.2" y="1" width="3.6" height="9" rx="1.6" />
          <rect x="7.5" y="8.5" width="9" height="14" rx="4" />
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
