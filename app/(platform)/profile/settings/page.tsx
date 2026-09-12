import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { SettingsForm } from "@/components/players/settings-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="max-w-md">
      <h1 className="mb-4 font-display text-2xl font-bold text-text">Configuración</h1>
      <Card>
        <CardContent className="p-5">
          <SettingsForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
