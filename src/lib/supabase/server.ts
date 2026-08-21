import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Anon-key client bound to the request cookies. Use this for anything that
 * should run as the signed-in admin (the /admin screens) or as nobody at all.
 *
 * RLS gives anon zero access, so this client cannot read or write customer
 * data - that is deliberate. Public writes go through server actions using
 * createAdminSupabase() with a zod-validated payload (SPEC §6).
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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
            // Server Components cannot set cookies. Safe to ignore: the auth
            // session is refreshed in middleware instead.
          }
        },
      },
    },
  );
}
