import { Dialog } from "@/components/ui/dialog";
import type { UnoColor } from "@/lib/games/uno";

const OPTIONS: { color: UnoColor; className: string; label: string }[] = [
  { color: "red", className: "bg-[#e33]", label: "Rojo" },
  { color: "yellow", className: "bg-[#eab308]", label: "Amarillo" },
  { color: "green", className: "bg-[#22b455]", label: "Verde" },
  { color: "blue", className: "bg-[#3b82f6]", label: "Azul" },
];

export function ColorPickerDialog({
  open,
  onClose,
  onChoose,
}: {
  open: boolean;
  onClose: () => void;
  onChoose: (color: UnoColor) => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Elegí un color" description="La carta especial necesita un color activo.">
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.color}
            onClick={() => onChoose(opt.color)}
            className={`${opt.className} flex h-16 items-center justify-center rounded-xl font-display font-bold text-white shadow-card transition-transform hover:-translate-y-0.5`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </Dialog>
  );
}
