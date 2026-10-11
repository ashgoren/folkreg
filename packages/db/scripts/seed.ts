// Local fixtures, run after `supabase db reset` (`pnpm db:reset` at the repo root does both).
// Tenants go through the same createTenant()/createTenantWithOwner() as real ones, so fixtures
// always start from the current defaultTenantConfig().
//
// Each test suite gets its own tenant, because turbo runs every package's `test` task in
// parallel and the suites mutate tenant config -- sharing one tenant would make them race:
//   test-tenant        packages/db integration tests (service role, so no owner)
//   admin-test-tenant  apps/admin server action tests (owned by admin-owner@test.local)
//   e2e-tenant         apps/admin Playwright tests (owned by e2e-owner@test.local)
//   other-tenant       a tenant owned by someone else, for cross-tenant RLS checks
//   dev                for manual use in the local apps; no test touches it. Its registration is
//                      open now, so the local registration app shows the form after every reset
// Owners are distinct users since getTenantByOwner (apps/admin/lib/tenant.ts) assumes one
// tenant per owner. Tests look tenants up by slug and users by email, never by id.
//
// The test-side copies of these names live in apps/admin/test/supabase.ts -- keep in sync.

import { defaultRegistrationConfig } from "@repo/tenant-config";
import { createTenant, createTenantWithOwner } from "../src/provisioning";
import { createTenantDb } from "../src/queries";
import { isLocalUrl } from "../src/local-url";
import { loadServiceClient } from "./service-client";

// The test users' password, which the tests sign in with.
const PASSWORD = "password";

const { service, url } = loadServiceClient(".env.test.local");
if (!isLocalUrl(url)) throw new Error(`Refusing to seed a non-local Supabase: ${url}`);

// The dev tenant's login can be set in .env.test.local (loaded just above), e.g. to an address and
// password the browser already autofills. No test signs in as it.
const DEV_EMAIL = process.env.SEED_DEV_EMAIL || "dev@example.com";
const DEV_PASSWORD = process.env.SEED_DEV_PASSWORD || PASSWORD;

const OWNED_TENANTS = [
  { slug: "admin-test-tenant", email: "admin-owner@test.local", password: PASSWORD },
  { slug: "e2e-tenant", email: "e2e-owner@test.local", password: PASSWORD },
  { slug: "other-tenant", email: "other-owner@test.local", password: PASSWORD },
  { slug: "dev", email: DEV_EMAIL, password: DEV_PASSWORD },
];

await createTenant(service, { slug: "test-tenant", ownerId: null });
for (const { slug, email, password } of OWNED_TENANTS) {
  const { tenantId } = await createTenantWithOwner(service, { slug, email, password });
  // The test tenants keep the closed default; their tests open registration when they need it.
  if (slug === "dev") {
    await createTenantDb(service, tenantId).updateTenant({ registration_config: { ...defaultRegistrationConfig(), opening: "now" } });
  }
}

// The password is printed only while it's the default; a custom one is left out of the terminal.
const devLogin = DEV_PASSWORD === PASSWORD ? `${DEV_EMAIL} / ${PASSWORD}` : DEV_EMAIL;
console.log(`Seeded ${OWNED_TENANTS.length + 1} tenants. Log in to the dev tenant as ${devLogin}.`);
