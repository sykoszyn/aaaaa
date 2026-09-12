"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const profile = await requireProfile();
  if (!profile.is_admin) throw new Error("No autorizado");
  return profile;
}

export async function setUserBanned(targetProfileId: string, banned: boolean) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("profiles").update({ is_banned: banned }).eq("id", targetProfileId);
  revalidatePath("/admin");
}

export async function closeRoom(roomId: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("game_rooms").update({ status: "closed" }).eq("id", roomId);
  revalidatePath("/admin");
}
