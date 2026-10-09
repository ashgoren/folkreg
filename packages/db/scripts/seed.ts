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
//   dev                for manual use in the local admin app; no test touches it
// Owners are distinct users since getTenantByOwner (apps/admin/lib/tenant.ts) assumes one
// tenant per owner. Tests look tenants up by slug and users by email, never by id.
//
// The test-side copies of these names live in apps/admin/test/supabase.ts -- keep in sync.

import { createTenant, createTenantWithOwner } from "../src/provisioning";
import { isLocalUrl } from "../src/local-url";
import { loadServiceClient } from "./service-client";

const PASSWORD = "password";

const OWNED_TENANTS = [
  { slug: "admin-test-tenant", email: "admin-owner@test.local" },
  { slug: "e2e-tenant", email: "e2e-owner@test.local" },
  { slug: "other-tenant", email: "other-owner@test.local" },
  { slug: "dev", email: "dev@example.com" },
];

const { service, url } = loadServiceClient(".env.test.local");
if (!isLocalUrl(url)) throw new Error(`Refusing to seed a non-local Supabase: ${url}`);

await createTenant(service, { slug: "test-tenant", ownerId: null });
for (const { slug, email } of OWNED_TENANTS) {
  await createTenantWithOwner(service, { slug, email, password: PASSWORD });
}

console.log(`Seeded ${OWNED_TENANTS.length + 1} tenants. Log in to the dev tenant as dev@example.com / ${PASSWORD}.`);
