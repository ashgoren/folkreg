import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database, DbClient } from "@repo/types";
import { getTenantBySlug } from "./queries";

// Loaded here rather than via a Vitest setupFiles entry, so every test file that imports this
// module is guaranteed the env is populated before it reads process.env -- no separate config
// wiring for test files to remember.
config({ path: ".env.test.local" });

// Bypasses the server-only-guarded createServiceRoleClient (./server.ts) -- that guard throws
// unconditionally under plain Node/Vitest, since it only resolves to a safe no-op under Next.js's
// react-server bundler condition, which Vitest's plain Node environment never matches.
export const createTestClient = (): DbClient =>
  createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

export const getTestTenantId = async (supabase: DbClient): Promise<string> => {
  const tenant = await getTenantBySlug(supabase, "test-tenant");
  if (!tenant) throw new Error("Seed tenant not found -- run `supabase db reset` to apply supabase/seed.sql");
  return tenant.id;
};
