import type { CSSProperties } from "react";
import type { TrucoSuit } from "@/lib/games/truco";

interface SuitIconProps {
  suit: TrucoSuit;
  className?: string;
  style?: CSSProperties;
}

/**
 * Íconos propios para los 4 palos españoles — con más detalle que un ícono
 * plano genérico (moneda con roseta grabada, copa con asas y base, espada
 * con guarda, basto con nudos de madera) para que se sientan como un naipe
 * de verdad, pero dibujados desde cero: ninguna forma acá calca la
 * ilustración de un mazo comercial puntual, solo la iconografía genérica y
 * centenaria de oro/copa/espada/basto que no es de nadie.
 */
export function SuitIcon({ suit, className, style }: SuitIconProps) {
  switch (suit) {
    case "oro":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          <circle cx="12" cy="12" r="10" fillOpacity="0.2" />
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" strokeWidth="1" />
          {/* roseta central de 6 pétalos, como el grabado de una moneda antigua */}
          {Array.from({ length: 6 }, (_, i) => {
            const angle = (i * 60 * Math.PI) / 180;
            const x = 12 + 3.1 * Math.cos(angle);
            const y = 12 + 3.1 * Math.sin(angle);
            return <circle key={i} cx={x} cy={y} r="2.1" />;
          })}
          <circle cx="12" cy="12" r="1.6" />
        </svg>
      );
    case "copa":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          {/* cáliz con dos asas, copa y base — silueta de contorno */}
          <path d="M7 3.5h10v3.2c0 3.1-1.6 5.3-3.5 6v3.8h2.2v1.6H8.3v-1.6h2.2v-3.8c-1.9-.7-3.5-2.9-3.5-6V3.5Z" />
          <path
            d="M6.6 5.2c-1.7.3-2.9 1.5-2.9 3 0 1.7 1.5 3 3.5 3.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M17.4 5.2c1.7.3 2.9 1.5 2.9 3 0 1.7-1.5 3-3.5 3.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <rect x="7.3" y="19.4" width="9.4" height="1.7" rx="0.8" />
        </svg>
      );
    case "espada":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          {/* hoja recta con guarda y puño — formas rectas simples, no una curva difícil de leer chica */}
          <path d="M12 1 14.2 4 13.1 16 10.9 16 9.8 4Z" />
          <rect x="6" y="16" width="12" height="2" rx="1" />
          <rect x="10.7" y="18.2" width="2.6" height="4.6" rx="1.3" />
        </svg>
      );
    case "basto":
      return (
        <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
          {/* garrote de madera: mango fino arriba, cabeza gruesa abajo, con nudos */}
          <rect x="10.5" y="1" width="3" height="9.5" rx="1.5" />
          <rect x="8" y="9" width="8" height="13" rx="3.6" />
          <circle cx="12" cy="13" r="1" fillOpacity="0.4" />
          <circle cx="9.8" cy="17" r="0.9" fillOpacity="0.4" />
          <circle cx="14.2" cy="18.2" r="0.9" fillOpacity="0.4" />
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
