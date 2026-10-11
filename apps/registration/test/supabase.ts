// Shared Supabase helpers for Vitest and Playwright tests. Not imported by any app code.

import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { isLocalUrl } from "@repo/db/local-url";
import { defaultTenantConfig, type TenantConfig } from "@repo/tenant-config";
import type { Database, DbClient } from "@repo/types";

// Loaded here (rather than via Vitest/Playwright config) so every test that imports these
// helpers is guaranteed a populated env, whichever runner it's under. Resolved from this file's
// location rather than the working directory, and overriding the shell's values, so the tests
// always use the database .env.test.local describes.
config({ path: fileURLToPath(new URL("../.env.test.local", import.meta.url)), override: true, quiet: true });

const url = process.env.SUPABASE_URL!;

// These helpers overwrite tenant config wholesale. Refusing anything but a local Supabase keeps a
// misconfigured .env.test.local from ever pointing them at real data.
if (!isLocalUrl(url ?? "")) {
  throw new Error(`Refusing to run tests against non-local SUPABASE_URL: ${url}`);
}

// Seeded by packages/db/scripts/seed.ts -- keep in sync.
export const REGISTRATION_TENANT_SLUG = "registration-test-tenant";

// Bypasses RLS, as the registration app's own service-role client does. Constructed here rather
// than through @repo/db/server's createServiceRoleClient, whose `server-only` import throws
// outside Next.
export const createServiceClient = (): DbClient =>
  createClient<Database>(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export const getTenantIdBySlug = async (service: DbClient, slug: string): Promise<string> => {
  const { data, error } = await service.from("tenants").select("id").eq("slug", slug).single();
  if (error) throw new Error(`Seed tenant "${slug}" not found -- run \`pnpm db:reset\`: ${error.message}`);
  return data.id;
};

// Writes the given config columns, leaving the rest as they are. For arranging what a test
// needs on top of resetTenant's defaults, e.g. registration opened or scheduled.
export const updateTenantConfig = async (service: DbClient, tenantId: string, config: Partial<TenantConfig>) => {
  const { error } = await service.from("tenants").update(config).eq("id", tenantId);
  if (error) throw error;
};

// Returns a tenant to the state createTenant() leaves it in: every config column at its default.
// Each test starts from here instead of depending on what an earlier test left behind. The
// registration app never writes secrets, so unlike the admin's reset this leaves them alone.
export const resetTenant = (service: DbClient, tenantId: string) =>
  updateTenantConfig(service, tenantId, defaultTenantConfig());
