import Image from "next/image";
import { cn } from "@/utils/cn";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  online?: boolean;
  className?: string;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Avatar({ src, name, size = 40, online, className }: AvatarProps) {
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }}>
      {src ? (
        <Image
          src={src}
          alt={name}
          width={size}
          height={size}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-accent to-cyan text-xs font-bold text-white"
          style={{ fontSize: size * 0.36 }}
        >
          {initials(name)}
        </div>
      )}
      {online !== undefined && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 block rounded-full ring-2 ring-ink",
            online ? "bg-success" : "bg-text-faint",
          )}
          style={{ width: size * 0.28, height: size * 0.28 }}
        />
      )}
    </div>
  );
}
