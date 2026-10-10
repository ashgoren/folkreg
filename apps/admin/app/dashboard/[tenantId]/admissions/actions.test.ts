import { describe, it, expect, vi } from "vitest";
import { readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateAdmissions } from "./actions";
import { defaultAdmissionsConfig } from "@repo/tenant-config";
import type { AdmissionsConfig } from "@repo/tenant-config";

const values = (overrides: Partial<AdmissionsConfig> = {}): AdmissionsConfig => ({ ...defaultAdmissionsConfig(), waitlist: { when: "when-full", capacity: 200 }, ...overrides });

describe("updateAdmissions", () => {
  const harness = useActionHarness(createClient);
  const savedConfig = async () => (await readTenant(harness.service, harness.tenantId)).admissions_config;

  it.each<[string, AdmissionsConfig]>([
    ["sliding-scale", values({ slidingScale: { min: 20, max: 100, default: 60 } })],
    ["fixed", values({ mode: "fixed", fixed: { price: 75 }, waitlist: { when: "now", capacity: 200 } })],
    ["tiered", values({
      mode: "tiered",
      tiered: {
        earlybirdCutoff: "2026-03-01",
        lateIncrease: 10,
        prices: [
          { ageGroup: "adult", options: [{ label: "Supporter", price: 120 }, { label: "Basic", price: 80 }] },
          { ageGroup: "6-12", options: [{ label: "", price: 40 }] },
        ],
      },
    })],
  ])("saves a %s config as-is", async (_, config) => {
    expect(await updateAdmissions(harness.tenantId, config)).toBeNull();
    expect(await savedConfig()).toEqual(config);
  });

  // Switching modes only changes which values apply, so an accidental switch can't cost an
  // organizer the prices entered for another mode.
  it("keeps the other modes' values when the mode changes", async () => {
    const tiered = { ...defaultAdmissionsConfig().tiered, prices: [{ ageGroup: "adult", options: [{ label: "", price: 80 }] }] };
    await updateAdmissions(harness.tenantId, values({ mode: "tiered", tiered }));
    await updateAdmissions(harness.tenantId, values({ mode: "sliding-scale", tiered }));
    expect(await savedConfig()).toMatchObject({ mode: "sliding-scale", tiered });
  });

  itGuardsTheAction({
    harness, createClient, run: updateAdmissions,
    validValues: () => values(),
    invalidValues: () => values({ slidingScale: { min: 120, max: 500, default: 9999 } }),
  });
});
