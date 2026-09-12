"use client";

import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { Avatar } from "@/components/ui/avatar";
import { XpBar } from "@/components/players/xp-bar";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export function ProfileMenu({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full">
        <Avatar src={profile.avatar_url} name={profile.display_name} size={36} online />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="glass absolute right-0 top-12 z-50 w-64 rounded-xl border border-border-strong p-3 shadow-card">
            <div className="flex items-center gap-3 pb-3">
              <Avatar src={profile.avatar_url} name={profile.display_name} size={44} />
              <div>
                <p className="font-medium text-text">{profile.display_name}</p>
                <p className="text-xs text-text-faint">@{profile.username}</p>
              </div>
            </div>
            <XpBar level={profile.level} xp={profile.xp} className="mb-3" />
            <nav className="flex flex-col gap-0.5 border-t border-border pt-2">
              <Link
                href={`/profile/${profile.username}`}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-dim hover:bg-surface-3 hover:text-text"
                onClick={() => setOpen(false)}
              >
                <User className="size-4" /> Mi perfil
              </Link>
              <Link
                href="/profile/settings"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-text-dim hover:bg-surface-3 hover:text-text"
                onClick={() => setOpen(false)}
              >
                <Settings className="size-4" /> Configuración
              </Link>
              <form action={signOut}>
                <button className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-rose hover:bg-rose/10">
                  <LogOut className="size-4" /> Cerrar sesión
                </button>
              </form>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
