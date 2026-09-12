import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Privileged Supabase client using the SERVICE ROLE KEY — bypasses RLS.
 *
 * `import "server-only"` makes any accidental import from a Client
 * Component fail the build instead of leaking the key into browser JS.
 * Use this ONLY inside Server Actions / Route Handlers, and only for the
 * exact writes that need to bypass RLS (validated game moves, match
 * results, admin actions). Never pass this client — or its key — to code
 * that runs in the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "The admin client must never be created on the client — check this " +
        "import chain.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
