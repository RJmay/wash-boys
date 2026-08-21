import { createBrowserClient } from "@supabase/ssr";

import { publicEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Browser client, anon key. One job: the admin login form (Supabase Auth,
 * single user).
 *
 * It cannot read or write any table - RLS denies anon everywhere - and the
 * job-photos bucket is private, so photo uploads go through a server action
 * too rather than straight from the browser. Booking data always moves
 * through server actions.
 */
export function createBrowserSupabase() {
  const env = publicEnv();
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
