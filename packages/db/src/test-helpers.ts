import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database, DbClient } from "@repo/types";
import { isLocalUrl } from "./local-url";
import { getTenantBySlug } from "./queries";

// Loaded here rather than via a Vitest setupFiles entry, so every test file that imports this
// module is guaranteed the env is populated before it reads process.env -- no separate config
// wiring for test files to remember. Resolved from this file's location (src/, hence the `../`)
// rather than the working directory.
config({ path: fileURLToPath(new URL("../.env.test.local", import.meta.url)) });

// These tests overwrite test-tenant's config and secrets wholesale. Refusing anything but a local
// Supabase keeps a misconfigured .env.test.local from ever pointing them at real data (same guard
// as apps/admin/test/supabase.ts).
if (!isLocalUrl(process.env.SUPABASE_URL ?? "")) {
  throw new Error(`Refusing to run tests against non-local SUPABASE_URL: ${process.env.SUPABASE_URL}`);
}

// Bypasses the server-only-guarded createServiceRoleClient (./server.ts) -- that guard throws
// unconditionally under plain Node/Vitest, since it only resolves to a safe no-op under Next.js's
// react-server bundler condition, which Vitest's plain Node environment never matches.
export const createTestClient = (): DbClient =>
  createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

export const getTestTenantId = async (supabase: DbClient): Promise<string> => {
  const tenant = await getTenantBySlug(supabase, "test-tenant");
  if (!tenant) throw new Error("Seed tenant not found -- run `pnpm db:reset` to apply the seed");
  return tenant.id;
};
