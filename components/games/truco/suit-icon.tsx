import type { TrucoSuit } from "@/lib/games/truco";

/** Íconos propios para los 4 palos españoles — nada de clones de mazos
 * existentes, formas simples pensadas para leerse bien en una carta chica. */
export function SuitIcon({ suit, className }: { suit: TrucoSuit; className?: string }) {
  switch (suit) {
    case "oro":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <circle cx="12" cy="12" r="9" fillOpacity="0.25" />
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
    case "copa":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <path d="M5 4h14l-1.4 8.2A5.6 5.6 0 0 1 12 17a5.6 5.6 0 0 1-5.6-4.8L5 4Z" />
          <rect x="10.5" y="17" width="3" height="4" />
          <rect x="7.5" y="20" width="9" height="1.6" rx="0.8" />
        </svg>
      );
    case "espada":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <path d="M12 2 13.3 3.3 13.3 15.5 12 19 10.7 15.5 10.7 3.3 12 2Z" />
          <rect x="7.5" y="15" width="9" height="1.8" rx="0.5" />
          <rect x="10.9" y="17" width="2.2" height="5" />
        </svg>
      );
    case "basto":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor">
          <rect x="10.4" y="3" width="3.2" height="17" rx="1.6" transform="rotate(8 12 11.5)" />
          <circle cx="9.5" cy="4.5" r="2.6" />
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
