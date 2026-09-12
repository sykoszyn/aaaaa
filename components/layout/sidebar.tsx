"use client";

import { Gamepad2, Home, ShieldCheck, Swords, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";

const NAV_ITEMS = [
  { href: "/home", label: "Inicio", icon: Home },
  { href: "/games", label: "Jugar", icon: Gamepad2 },
  { href: "/rooms", label: "Salas", icon: Swords },
  { href: "/leaderboards", label: "Rankings", icon: Trophy },
  { href: "/friends", label: "Amigos", icon: Users },
] as const;

export function Sidebar({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...NAV_ITEMS, { href: "/admin", label: "Admin", icon: ShieldCheck }] : NAV_ITEMS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-surface/95 backdrop-blur-lg lg:inset-y-0 lg:left-0 lg:h-full lg:w-20 lg:flex-col lg:justify-start lg:gap-2 lg:border-t-0 lg:border-r lg:py-6">
      <Link href="/home" className="hidden items-center justify-center lg:mb-6 lg:flex">
        <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-cyan font-display text-lg font-black text-white shadow-glow-accent">
          JA
        </span>
      </Link>

      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "group relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-[11px] font-medium transition-colors lg:w-16",
              active ? "text-text" : "text-text-faint hover:text-text-dim",
            )}
          >
            {active && (
              <span className="absolute inset-0 -z-10 rounded-xl bg-accent/15 lg:inset-x-1" aria-hidden />
            )}
            <Icon className={cn("size-5", active && "text-accent-hover")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
