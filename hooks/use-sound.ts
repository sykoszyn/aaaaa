"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "ja:sound-enabled";

function readStoredPreference(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : stored === "1";
}

/**
 * Global sound on/off preference, persisted client-side. Actual audio
 * files aren't loaded until Fase 2+ (cada juego trae sus propios sonidos
 * cortos: carta, dado, golpe de bola, victoria/derrota); este hook es el
 * único punto de verdad para "¿debo reproducir sonido?" para que ningún
 * juego cargue audio si el usuario lo apagó.
 */
export function useSound() {
  const [enabled, setEnabled] = useState(readStoredPreference);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const play = useCallback(
    (src: string, volume = 0.5) => {
      if (!enabled) return;
      const audio = new Audio(src);
      audio.volume = volume;
      void audio.play().catch(() => {});
    },
    [enabled],
  );

  return { enabled, toggle, play };
}
