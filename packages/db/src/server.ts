import { type Database } from "@repo/types";
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type DbClient = SupabaseClient<Database>

export function createServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}
