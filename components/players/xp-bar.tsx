import { cn } from "@/utils/cn";

/** Regla de nivel: level = floor(sqrt(xp / 100)) + 1 (ver recalculate_level() en SQL). */
function xpForLevel(level: number) {
  return Math.pow(level - 1, 2) * 100;
}

export function XpBar({ level, xp, className }: { level: number; xp: number; className?: string }) {
  const currentFloor = xpForLevel(level);
  const nextCeiling = xpForLevel(level + 1);
  const progress = Math.min(100, Math.max(0, ((xp - currentFloor) / (nextCeiling - currentFloor)) * 100));

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1 flex items-center justify-between text-xs text-text-dim">
        <span className="font-medium text-gold">Nivel {level}</span>
        <span>{xp.toLocaleString("es-AR")} XP</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold to-accent transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
