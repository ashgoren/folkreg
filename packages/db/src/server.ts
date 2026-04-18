import 'server-only';

import { type Database } from "@repo/types";
import { createClient } from "@supabase/supabase-js"

export function createServiceRoleClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}
