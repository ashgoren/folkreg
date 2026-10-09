import { describe, it, expect, vi } from "vitest";
import { ADMIN_TENANT_SLUG, OTHER_TENANT_SLUG, readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// The real createClient() reads the session from Next's request cookies (next/headers), which
// don't exist outside a Next request. Swapping just this factory for a real supabase-js client
// signed in as a seeded user keeps everything past it real: PostgREST, RLS, and the queries
// in @repo/db.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateGeneral } from "./actions";
import type { GeneralValues } from "./schema";

const values = (overrides: Partial<GeneralValues> = {}): GeneralValues => ({
  slug: ADMIN_TENANT_SLUG,
  is_live: true,
  show_preregistration: true,
  ...overrides,
});

describe("updateGeneral", () => {
  const harness = useActionHarness(createClient);

  it("saves slug, is_live, and show_preregistration", async () => {
    expect(await updateGeneral(harness.tenantId, values({ slug: "renamed-tenant" }))).toBeNull();

    const tenant = await readTenant(harness.service, harness.tenantId);
    expect(tenant.slug).toBe("renamed-tenant");
    expect(tenant.is_live).toBe(true);
    expect(tenant.show_preregistration).toBe(true);
  });

  it("leaves every config column alone", async () => {
    const configColumns = (tenant: Awaited<ReturnType<typeof readTenant>>) => ({
      event_config: tenant.event_config,
      fields_config: tenant.fields_config,
      admissions_config: tenant.admissions_config,
      payments_config: tenant.payments_config,
      theme_config: tenant.theme_config,
      waiver_config: tenant.waiver_config,
      receipts_config: tenant.receipts_config,
      spreadsheet_config: tenant.spreadsheet_config,
    });
    const before = configColumns(await readTenant(harness.service, harness.tenantId));
    await updateGeneral(harness.tenantId, values());
    expect(configColumns(await readTenant(harness.service, harness.tenantId))).toEqual(before);
  });

  // PostgREST names the violated constraint only in `message` -- `details` is null for this
  // error under the authenticated role -- so that's what the action matches on.
  it("maps a duplicate-slug unique violation to a readable message", async () => {
    expect(await updateGeneral(harness.tenantId, values({ slug: OTHER_TENANT_SLUG }))).toBe("That slug is already taken");
  });

  it("never applies a duplicate slug", async () => {
    await updateGeneral(harness.tenantId, values({ slug: OTHER_TENANT_SLUG }));
    expect((await readTenant(harness.service, harness.tenantId)).slug).toBe(ADMIN_TENANT_SLUG);
  });

  itGuardsTheAction({
    harness, createClient, run: updateGeneral,
    validValues: () => values(),
    invalidValues: () => values({ slug: "Has Spaces" }),
  });
});
