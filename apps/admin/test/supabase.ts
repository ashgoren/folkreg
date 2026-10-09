// Shared Supabase helpers for server action tests and Playwright e2e tests. Not imported by
// any app code.

import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { defaultTenantConfig } from "@repo/tenant-config";
import type { Database, DbClient, TablesUpdate } from "@repo/types";

// Loaded here (rather than via Vitest/Playwright config) so every test that imports these
// helpers is guaranteed a populated env, whichever runner it's under -- same reasoning as
// packages/db/src/test-helpers.ts.
config({ path: fileURLToPath(new URL("../.env.test.local", import.meta.url)), quiet: true });

const url = process.env.SUPABASE_URL!;

// These helpers overwrite tenant config and secrets wholesale. Refusing anything but a local
// Supabase keeps a misconfigured .env.test.local from ever pointing them at real data.
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url ?? "")) {
  throw new Error(`Refusing to run tests against non-local SUPABASE_URL: ${url}`);
}

// Seeded by packages/db/scripts/seed.ts -- keep in sync.
export const TEST_PASSWORD = "password";
export const ADMIN_OWNER_EMAIL = "admin-owner@test.local";
export const E2E_OWNER_EMAIL = "e2e-owner@test.local";
export const OTHER_OWNER_EMAIL = "other-owner@test.local";
export const ADMIN_TENANT_SLUG = "admin-test-tenant";
export const E2E_TENANT_SLUG = "e2e-tenant";
export const OTHER_TENANT_SLUG = "other-tenant";

// Bypasses RLS -- for arranging fixture state and for asserting on what actually got written,
// independent of whatever the code under test is allowed to see.
export const createServiceClient = (): DbClient =>
  createClient<Database>(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

// A publishable-key client with a real signed-in session -- the same identity and RLS context
// the admin app's cookie-backed server client carries during a real request.
export const signInAs = async (email: string): Promise<DbClient> => {
  const client = createClient<Database>(url, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD });
  if (error) throw new Error(`Sign-in as ${email} failed (run \`pnpm db:reset\` to apply the seed): ${error.message}`);
  return client;
};

// A publishable-key client with no session -- what the server client looks like for a
// logged-out request.
export const createAnonClient = (): DbClient =>
  createClient<Database>(url, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

export const getTenantIdBySlug = async (service: DbClient, slug: string): Promise<string> => {
  const { data, error } = await service.from("tenants").select("id").eq("slug", slug).single();
  if (error) throw new Error(`Seed tenant "${slug}" not found -- run \`pnpm db:reset\`: ${error.message}`);
  return data.id;
};

// Returns a tenant to the state createTenant() leaves it in: every config column at its default
// (spreadsheet_config null), scalars at their defaults, every secret null. Each test starts from
// here instead of depending on what an earlier test left behind.
export const resetTenant = async (service: DbClient, tenantId: string, slug: string) => {
  // Cast for the same reason as createTenant's insert (packages/db/src/provisioning.ts).
  const { error: tenantError } = await service.from("tenants").update({
    slug,
    is_live: false,
    show_preregistration: false,
    ...defaultTenantConfig(),
    spreadsheet_config: null,
  } as unknown as TablesUpdate<"tenants">).eq("id", tenantId);
  if (tenantError) throw tenantError;

  const { error: secretsError } = await service.from("tenant_secrets").update({
    stripe_secret_key_live: null,
    stripe_webhook_secret_live: null,
    stripe_secret_key_test: null,
    stripe_webhook_secret_test: null,
    paypal_secret_live: null,
    paypal_webhook_id_live: null,
    paypal_secret_test: null,
    paypal_webhook_id_test: null,
    docuseal_key: null,
  }).eq("tenant_id", tenantId);
  if (secretsError) throw secretsError;
};

export const readTenant = async (service: DbClient, tenantId: string) => {
  const { data, error } = await service.from("tenants").select("*").eq("id", tenantId).single();
  if (error) throw error;
  return data;
};

export const readSecrets = async (service: DbClient, tenantId: string) => {
  const { data, error } = await service.from("tenant_secrets").select("*").eq("tenant_id", tenantId).single();
  if (error) throw error;
  return data;
};
