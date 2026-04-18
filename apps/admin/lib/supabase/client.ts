import { createBrowserClient } from "@supabase/ssr";
import { type Database, DbClient } from "@repo/types";

export function createClient(): DbClient {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
