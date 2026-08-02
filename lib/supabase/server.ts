import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

/**
 * Request-scoped Supabase client for Server Components, Route Handlers and
 * Server Actions. Reads/writes the auth cookie via Next's cookie store.
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component render - cookies are read-only here.
            // The middleware refresh path handles writing the rotated session.
          }
        },
      },
    },
  );
}

/**
 * Privileged client using the service-role/secret key. Bypasses RLS - use only
 * in trusted server code (never expose the key to the browser). Returns null if
 * no secret key is configured so callers can degrade gracefully.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) return null;
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookies: { getAll: () => [], setAll: () => {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
