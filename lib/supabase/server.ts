import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/**
 * Server-side Supabase client scoped to the current request's session
 * (reads the user's auth cookie via `@supabase/ssr`). Respects RLS as the
 * signed-in user — use this in Server Components, Server Actions and Route
 * Handlers for anything that should be subject to the user's own permissions.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render — middleware refreshes
            // the session cookie instead, so this is safe to ignore.
          }
        },
      },
    },
  );
}
