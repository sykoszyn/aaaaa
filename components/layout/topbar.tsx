import { NotificationsBell } from "@/components/layout/notifications-bell";
import { OnlineBadge } from "@/components/layout/online-badge";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { SoundToggle } from "@/components/layout/sound-toggle";
import { createClient } from "@/lib/supabase/server";
import { countOnlinePlayers } from "@/lib/rooms/queries";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function TopBar({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const [{ data: notifications }, onlineCount] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20),
    countOnlinePlayers(),
  ]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-ink/80 px-4 backdrop-blur-lg sm:px-6">
      <OnlineBadge initialCount={onlineCount} />
      <div className="flex items-center gap-1.5">
        <SoundToggle />
        <NotificationsBell profileId={profile.id} initial={notifications ?? []} />
        <ProfileMenu profile={profile} />
      </div>
    </header>
  );
}
