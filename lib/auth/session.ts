import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Reads the current session's user + profile from a Server Component,
 * Server Action or Route Handler. Returns null if there's no session —
 * callers on platform routes never hit this path unauthenticated because
 * middleware already redirects to /login, but this stays defensive for
 * anything reachable without going through that matcher (e.g. Route
 * Handlers called directly).
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile ?? null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error("UNAUTHENTICATED");
  }
  return profile;
}
