import { describe, it, expect, vi } from "vitest";
import { ADMIN_TENANT_SLUG, OTHER_TENANT_SLUG, readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// The real createClient() reads the session from Next's request cookies (next/headers), which
// don't exist outside a Next request. Swapping just this factory for a real supabase-js client
// signed in as a seeded user keeps everything past it real: PostgREST, RLS, and the queries
// in @repo/db.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateSlug } from "./actions";

describe("updateSlug", () => {
  const harness = useActionHarness(createClient);

  it("saves the subdomain alone", async () => {
    const before = await readTenant(harness.service, harness.tenantId);
    expect(await updateSlug(harness.tenantId, "renamed-tenant")).toBeNull();
    const tenant = await readTenant(harness.service, harness.tenantId);
    expect(tenant.slug).toBe("renamed-tenant");
    expect({ ...tenant, slug: before.slug, updated_at: before.updated_at }).toEqual(before);
  });

  // PostgREST names the violated constraint only in `message` -- `details` is null for this
  // error under the authenticated role -- so that's what the action matches on.
  it("says so, and changes nothing, when another tenant has the subdomain", async () => {
    expect(await updateSlug(harness.tenantId, OTHER_TENANT_SLUG)).toBe("That subdomain is already taken");
    expect((await readTenant(harness.service, harness.tenantId)).slug).toBe(ADMIN_TENANT_SLUG);
  });

  itGuardsTheAction({
    harness, createClient, run: updateSlug,
    validValues: () => "renamed-tenant",
    invalidValues: () => "admin",
  });
});
