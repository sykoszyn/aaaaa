import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { OnlineHeartbeat } from "@/components/layout/online-heartbeat";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function PlatformLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (profile.is_banned) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink px-4 text-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-text">Tu cuenta está suspendida</h1>
          <p className="mt-2 text-text-dim">Si creés que es un error, contactá a soporte.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink">
      <OnlineHeartbeat />
      <Sidebar isAdmin={profile.is_admin} />
      <div className="pb-16 lg:pb-0 lg:pl-20">
        <TopBar profile={profile} />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
