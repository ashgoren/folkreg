// Shared lifecycle for server action tests. Each action test file still declares its own
// `vi.mock("@/lib/supabase/server", ...)` -- Vitest hoists vi.mock above that file's imports,
// which is what guarantees the action module sees the mock. A vi.mock inside this helper
// wouldn't be hoisted above the test file's imports, so the real createClient could load first.

import { afterAll, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type { DbClient } from "@repo/types";
import {
  ADMIN_OWNER_EMAIL, ADMIN_TENANT_SLUG, OTHER_TENANT_SLUG,
  createAnonClient, createServiceClient, getTenantIdBySlug, readSecrets, readTenant, resetTenant, signInAs,
} from "./supabase";

type CreateClient = () => Promise<DbClient>;

export type ActionHarness = {
  service: DbClient;
  /** admin-test-tenant, owned by the signed-in test user */
  tenantId: string;
  /** other-tenant, owned by a different user */
  otherTenantId: string;
};

// Signs the mocked createClient in as admin-owner@test.local for the whole file, and resets
// both tenants before every test so no test depends on another's leftovers.
export const useActionHarness = (createClient: CreateClient): ActionHarness => {
  const harness: ActionHarness = { service: createServiceClient(), tenantId: "", otherTenantId: "" };
  const resetBoth = async () => {
    await resetTenant(harness.service, harness.tenantId, ADMIN_TENANT_SLUG);
    await resetTenant(harness.service, harness.otherTenantId, OTHER_TENANT_SLUG);
  };

  beforeAll(async () => {
    harness.tenantId = await getTenantIdBySlug(harness.service, ADMIN_TENANT_SLUG);
    harness.otherTenantId = await getTenantIdBySlug(harness.service, OTHER_TENANT_SLUG);
    vi.mocked(createClient).mockResolvedValue(await signInAs(ADMIN_OWNER_EMAIL));
  });
  beforeEach(resetBoth);
  afterAll(resetBoth);

  return harness;
};

// For the next call only, createClient returns a client with no session -- a logged-out request.
export const actAsLoggedOut = (createClient: CreateClient) =>
  vi.mocked(createClient).mockResolvedValueOnce(createAnonClient());

// The same guarantees every config action makes, registered as tests: it rejects malformed
// input, refuses to run logged out, and never writes to a tenant the user doesn't own -- and
// says so, rather than reporting success for a write RLS quietly filtered down to zero rows.
export const itGuardsTheAction = ({ harness, createClient, run, validValues, invalidValues }: {
  harness: ActionHarness;
  createClient: CreateClient;
  run: (tenantId: string, values: never) => Promise<string | null>;
  validValues: () => unknown;
  invalidValues: () => unknown;
}) => {
  const call = (tenantId: string, values: unknown) => run(tenantId, values as never);
  const snapshot = async (tenantId: string) => ({
    tenant: await readTenant(harness.service, tenantId),
    secrets: await readSecrets(harness.service, tenantId),
  });
  // updated_at is bumped by a trigger on any UPDATE, so it's excluded from "nothing changed".
  const withoutTimestamps = ({ tenant, secrets }: Awaited<ReturnType<typeof snapshot>>) =>
    ({ tenant: { ...tenant, updated_at: null }, secrets });

  it("rejects malformed input without writing anything", async () => {
    const before = await snapshot(harness.tenantId);
    expect(await call(harness.tenantId, invalidValues())).toBe("Invalid data");
    expect(await snapshot(harness.tenantId)).toEqual(before);
  });

  it("refuses to save without a session", async () => {
    const before = await snapshot(harness.tenantId);
    actAsLoggedOut(createClient);
    expect(await call(harness.tenantId, validValues())).toBe("Not authenticated");
    expect(await snapshot(harness.tenantId)).toEqual(before);
  });

  it("never modifies a tenant the user doesn't own", async () => {
    const before = await snapshot(harness.otherTenantId);
    await call(harness.otherTenantId, validValues());
    expect(withoutTimestamps(await snapshot(harness.otherTenantId))).toEqual(withoutTimestamps(before));
  });

  it("reports an error when targeting a tenant the user doesn't own", async () => {
    expect(await call(harness.otherTenantId, validValues())).toBe("No tenant found");
  });
};
