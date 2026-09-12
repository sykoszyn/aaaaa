"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  displayName: z.string().min(2).max(30),
  bio: z.string().max(160).optional(),
  favoriteGame: z.enum(["uno", "truco", "pool", "bowling", "ludo", ""]).optional(),
});

export type SettingsActionState = { error?: string; success?: boolean } | null;

export async function updateProfileSettings(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const parsed = schema.safeParse({
    displayName: formData.get("displayName"),
    bio: formData.get("bio") || undefined,
    favoriteGame: formData.get("favoriteGame") || "",
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio ?? null,
      favorite_game: parsed.data.favoriteGame || null,
    })
    .eq("id", profile.id);

  if (error) return { error: "No se pudo guardar" };

  revalidatePath(`/profile/${profile.username}`);
  return { success: true };
}
