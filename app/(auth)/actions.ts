"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().email("Ingresá un email válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export type AuthActionState = {
  error?: string;
} | null;

export async function signIn(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Email o contraseña incorrectos" };
  }

  redirect("/home");
}

const registerSchema = credentialsSchema.extend({
  username: z
    .string()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(20, "El usuario debe tener como máximo 20 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo"),
});

export async function signUp(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    username: formData.get("username"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.username } },
  });

  if (error) {
    return { error: error.message === "User already registered" ? "Ese email ya está registrado" : error.message };
  }

  // handle_new_user() trigger creates the profile with a slug derived from
  // the email; rename it to the username the user actually chose.
  if (data.user) {
    const { error: renameError } = await supabase
      .from("profiles")
      .update({ username: parsed.data.username, display_name: parsed.data.username })
      .eq("id", data.user.id);

    if (renameError) {
      // Most likely a duplicate username (unique constraint) — the account
      // was still created with the auto-generated username, so let the
      // user know instead of silently keeping a name they didn't pick.
      return { error: "Ese nombre de usuario ya está en uso, elegí otro" };
    }
  }

  redirect("/home");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
