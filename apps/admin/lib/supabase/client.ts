import { createBrowserClient } from "@supabase/ssr";
import { type Database } from "@repo/types";
import { type DbClient } from "@repo/db/server";

export function createClient(): DbClient {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
