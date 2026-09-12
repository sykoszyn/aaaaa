"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/hooks/use-sound";
import { Button } from "@/components/ui/button";

export function SoundToggle() {
  const { enabled, toggle } = useSound();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={enabled ? "Silenciar sonido" : "Activar sonido"}
      title={enabled ? "Silenciar sonido" : "Activar sonido"}
    >
      {enabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
    </Button>
  );
}
