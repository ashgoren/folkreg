import { describe, it, expect, vi } from "vitest";
import { readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateRegistration } from "./actions";
import { defaultRegistrationConfig } from "@repo/tenant-config";
import type { RegistrationConfig } from "@repo/tenant-config";

const values = (overrides: Partial<RegistrationConfig> = {}): RegistrationConfig => ({ ...defaultRegistrationConfig(), ...overrides });

describe("updateRegistration", () => {
  const harness = useActionHarness(createClient);
  const savedConfig = async () => (await readTenant(harness.service, harness.tenantId)).registration_config;

  it("saves the config as-is", async () => {
    const config = values({
      opensAt: "2026-11-01T12:00",
      closesAt: "2026-11-15T12:00",
      closeAfter: { enabled: true, people: 400 },
      mode: "lottery",
      lotteryResultsDate: "2026-11-20",
    });
    expect(await updateRegistration(harness.tenantId, config)).toBeNull();
    expect(await savedConfig()).toEqual(config);
  });

  // Switching modes only changes which values apply.
  it("keeps the other modes' values when the mode changes", async () => {
    await updateRegistration(harness.tenantId, values({ mode: "lottery", lotteryResultsDate: "2026-11-20", waitlistAfter: { enabled: true, people: 240 } }));
    await updateRegistration(harness.tenantId, values({ mode: "pay", lotteryResultsDate: "2026-11-20", waitlistAfter: { enabled: true, people: 240 } }));
    expect(await savedConfig()).toMatchObject({ mode: "pay", lotteryResultsDate: "2026-11-20", waitlistAfter: { enabled: true, people: 240 } });
  });

  itGuardsTheAction({
    harness, createClient, run: updateRegistration,
    validValues: () => values({ open: false }),
    invalidValues: () => values({ opensAt: "2026-11-15T12:00", closesAt: "2026-11-01T12:00" }),
  });
});
