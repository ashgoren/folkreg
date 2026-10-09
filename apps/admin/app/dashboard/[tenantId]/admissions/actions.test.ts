import { describe, it, expect, vi } from "vitest";
import { readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateAdmissions } from "./actions";
import { defaultAdmissionsConfig } from "@repo/tenant-config";
import type { AdmissionsConfig } from "@repo/tenant-config";

const values = (overrides: Partial<AdmissionsConfig> = {}): AdmissionsConfig => ({ ...defaultAdmissionsConfig(), waitlistCutoff: 200, ...overrides });

describe("updateAdmissions", () => {
  const harness = useActionHarness(createClient);
  const savedConfig = async () => (await readTenant(harness.service, harness.tenantId)).admissions_config;

  it.each<[string, AdmissionsConfig]>([
    ["sliding-scale", values({ costRange: [20, 100], costDefault: 60 })],
    ["fixed", values({ mode: "fixed", cost: 75, forceWaitlist: true })],
    ["tiered", values({
      mode: "tiered",
      earlybirdCutoff: "2026-03-01",
      categories: [
        { label: "Adult", ageGroups: ["adult"], early: 80, later: 100 },
        { label: "Youth", ageGroups: ["6-12", "13-17"], early: 40, later: 50 },
      ],
    })],
  ])("saves a %s config as-is", async (_, config) => {
    expect(await updateAdmissions(harness.tenantId, config)).toBeNull();
    expect(await savedConfig()).toEqual(config);
  });

  // Switching modes only changes which values apply, so an accidental switch can't cost an
  // organizer the prices or categories entered for another mode.
  it("keeps the other modes' values when the mode changes", async () => {
    const categories = [{ label: "Adult", ageGroups: ["adult" as const], early: 80, later: 100 }];
    await updateAdmissions(harness.tenantId, values({ mode: "tiered", categories }));
    await updateAdmissions(harness.tenantId, values({ mode: "sliding-scale", categories }));
    expect(await savedConfig()).toMatchObject({ mode: "sliding-scale", categories });
  });

  itGuardsTheAction({
    harness, createClient, run: updateAdmissions,
    validValues: () => values(),
    invalidValues: () => values({ costDefault: 9999 }),
  });
});
