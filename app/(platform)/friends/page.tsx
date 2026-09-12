import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { AddFriendForm } from "@/components/players/add-friend-form";
import { FriendRequestsList } from "@/components/players/friend-requests-list";
import { FriendsOnlineList } from "@/components/players/friends-online-list";
import { getCurrentProfile } from "@/lib/auth/session";
import { getOnlineFriends } from "@/lib/rooms/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Amigos" };

export default async function FriendsPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const [friends, { data: incoming }] = await Promise.all([
    getOnlineFriends(profile.id),
    supabase
      .from("friend_requests")
      .select("id, created_at, profiles!friend_requests_sender_id_fkey(username, display_name, avatar_url)")
      .eq("receiver_id", profile.id)
      .eq("status", "pending"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Amigos</h1>
        <p className="mt-1 text-text-dim">Agregá jugadores por su usuario para armar salas privadas más rápido.</p>
      </div>

      <Card className="max-w-sm">
        <CardContent className="p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-text">Agregar amigo</h2>
          <AddFriendForm />
        </CardContent>
      </Card>

      {incoming && incoming.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <h2 className="mb-3 font-display text-base font-semibold text-text">Solicitudes pendientes</h2>
            <FriendRequestsList
              requests={incoming.map((r) => ({
                id: r.id,
                profile: r.profiles,
              }))}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 font-display text-base font-semibold text-text">Tus amigos ({friends.length})</h2>
          <FriendsOnlineList friends={friends} />
        </CardContent>
      </Card>
    </div>
  );
}
