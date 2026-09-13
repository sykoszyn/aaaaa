"use client";

import { useCallback } from "react";
import { useSound } from "@/hooks/use-sound";

/**
 * Voz en español para anunciar cantos de Truco (envido, truco, quiero,
 * flor, resultado de la mano) usando la Web Speech API del navegador —
 * no hay archivos de audio ni servicio externo de por medio, así que la
 * voz real depende de lo que el sistema operativo/navegador del jugador
 * tenga instalado. Se prioriza una voz "es-AR" si existe; si no, cualquier
 * voz en español; si el navegador no tiene ninguna, se sigue pidiendo
 * "es-AR" igual y que el motor por defecto haga lo que pueda — nunca
 * rompe nada si no hay voces (rate/pitch se ignoran, no hay error).
 *
 * Respeta el mismo interruptor de sonido que el resto de la app (el que
 * prende/apaga los efectos) — si el jugador lo tiene apagado, no habla.
 */
export function useVoiceAnnouncer() {
  const { enabled } = useSound();

  const pickVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang.toLowerCase() === "es-ar") ??
      voices.find((v) => v.lang.toLowerCase().startsWith("es")) ??
      null
    );
  }, []);

  const say = useCallback(
    (text: string) => {
      if (!enabled) return;
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "es-AR";
      utterance.rate = 1.05;
      utterance.pitch = 1;
      const voice = pickVoice();
      if (voice) utterance.voice = voice;
      window.speechSynthesis.speak(utterance);
    },
    [enabled, pickVoice],
  );

  return { say, voiceEnabled: enabled };
}
