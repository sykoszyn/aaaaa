import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BanToggleButton } from "@/components/players/ban-toggle-button";
import { getCurrentProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile?.is_admin) notFound();

  const supabase = createAdminClient();
  const [{ count: userCount }, { count: onlineCount }, { count: roomCount }, { count: matchCount }, { data: users }] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_online", true),
      supabase.from("game_rooms").select("id", { count: "exact", head: true }).in("status", ["waiting", "in_progress"]),
      supabase.from("game_matches").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(25),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-text">Panel de administración</h1>
        <p className="mt-1 text-text-dim">Visible solo para cuentas con is_admin = true.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Usuarios", userCount],
          ["Online ahora", onlineCount],
          ["Salas activas", roomCount],
          ["Partidas totales", matchCount],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="p-4">
              <p className="font-display text-2xl font-bold text-text">{value ?? 0}</p>
              <p className="text-xs text-text-faint">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-faint">
                <th className="p-3">Usuario</th>
                <th className="p-3">Nivel</th>
                <th className="p-3">Partidas</th>
                <th className="p-3">Estado</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-b border-border/50">
                  <td className="flex items-center gap-2 p-3">
                    <Avatar src={u.avatar_url} name={u.display_name} size={28} />
                    {u.display_name}
                    {u.is_admin && <Badge variant="accent">admin</Badge>}
                  </td>
                  <td className="p-3">{u.level}</td>
                  <td className="p-3">{u.matches_played}</td>
                  <td className="p-3">
                    <Badge variant={u.is_banned ? "danger" : "success"}>{u.is_banned ? "Suspendido" : "Activo"}</Badge>
                  </td>
                  <td className="p-3 text-right">
                    {!u.is_admin && <BanToggleButton profileId={u.id} banned={u.is_banned} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
