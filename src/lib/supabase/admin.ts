import "server-only";

import { createClient } from "@supabase/supabase-js";

import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Service-role client. Bypasses RLS, so it is the only way public form
 * submissions reach the database (SPEC §6).
 *
 * Rules:
 *  - server actions and route handlers only - the `server-only` import above
 *    turns any client-component import into a build error;
 *  - never return raw rows from this client to the browser;
 *  - every payload it writes must be zod-parsed first (see lib/validation.ts).
 */
let cached: ReturnType<typeof create> | undefined;

function create() {
  const { NEXT_PUBLIC_SUPABASE_URL } = publicEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv();

  return createClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        // No user session on this client - it is a trusted backend caller.
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export function createAdminSupabase() {
  cached ??= create();
  return cached;
}
