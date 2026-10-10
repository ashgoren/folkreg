import { describe, it, expect, vi } from "vitest";
import { readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateEvent } from "./actions";
import type { EventConfig } from "@repo/tenant-config";

const blank = (): EventConfig => ({
  title: "Spring Dance Weekend",
  location: "Grange Hall",
  start: "",
  end: "",
  timezone: "America/Los_Angeles",
  date: "April 3-5",
  calendar: { show: false, description: "", location: "" },
  contacts: { info: "", housing: "" },
  links: { info: "", health: "", safety: "" },
});

describe("updateEvent", () => {
  const harness = useActionHarness(createClient);
  const savedConfig = async () => (await readTenant(harness.service, harness.tenantId)).event_config;

  // The stored config is the form's values as entered: every key present, blanks as "".
  it("saves every field as entered, keeping blanks as \"\"", async () => {
    expect(await updateEvent(harness.tenantId, blank())).toBeNull();
    expect(await savedConfig()).toEqual(blank());
  });

  it("saves filled-in times, calendar, contact, and link fields", async () => {
    const values: EventConfig = {
      ...blank(),
      start: "2026-04-03T19:00",
      end: "2026-04-05T15:00",
      calendar: { show: true, description: "Dancing", location: "123 Main St, Portland, OR 97201" },
      contacts: { info: "info@example.org", housing: "housing@example.org" },
      links: { info: "https://example.org", health: "", safety: "https://example.org/safety" },
    };
    await updateEvent(harness.tenantId, values);
    expect(await savedConfig()).toEqual(values);
  });

  it("replaces the column wholesale, dropping keys that were cleared", async () => {
    await updateEvent(harness.tenantId, { ...blank(), links: { info: "https://example.org", health: "", safety: "" } });
    await updateEvent(harness.tenantId, blank());
    expect(await savedConfig()).toMatchObject({ links: {} });
  });

  itGuardsTheAction({
    harness, createClient, run: updateEvent,
    validValues: blank,
    invalidValues: () => ({ ...blank(), contacts: { info: "not-an-email", housing: "" } }),
  });
});
