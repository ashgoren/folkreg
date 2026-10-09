import { describe, it, expect, vi } from "vitest";
import { readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateAdmissions } from "./actions";
import type { AdmissionsValues } from "./schema";

const shared = { admissionQuantityMax: 4, waitlistCutoff: 200, forceWaitlist: false };
const slidingScale = (): AdmissionsValues => ({ mode: "sliding-scale", costRange: [20, 100], costDefault: 60, ...shared });

describe("updateAdmissions", () => {
  const harness = useActionHarness(createClient);
  const savedConfig = async () => (await readTenant(harness.service, harness.tenantId)).admissions_config;

  it.each<[string, AdmissionsValues]>([
    ["sliding-scale", slidingScale()],
    ["fixed", { mode: "fixed", cost: 75, ...shared, forceWaitlist: true }],
    ["tiered", {
      mode: "tiered",
      earlybirdCutoff: "2026-03-01",
      categories: [
        { label: "Adult", ageGroups: ["adult"], early: 80, later: 100 },
        { label: "Youth", ageGroups: ["6-12", "13-17"], early: 40, later: 50 },
      ],
      ...shared,
    }],
  ])("saves a %s config as-is", async (_, values) => {
    expect(await updateAdmissions(harness.tenantId, values)).toBeNull();
    expect(await savedConfig()).toEqual(values);
  });

  // The column holds exactly one mode's shape. Switching modes replaces it entirely rather
  // than merging, so no stale costRange lingers on a fixed-price config.
  it("drops the previous mode's fields when the mode changes", async () => {
    await updateAdmissions(harness.tenantId, slidingScale());
    await updateAdmissions(harness.tenantId, { mode: "fixed", cost: 75, ...shared });
    expect(await savedConfig()).not.toHaveProperty("costRange");
  });

  itGuardsTheAction({
    harness, createClient, run: updateAdmissions,
    validValues: slidingScale,
    invalidValues: () => ({ ...slidingScale(), costDefault: 500 }),
  });
});
