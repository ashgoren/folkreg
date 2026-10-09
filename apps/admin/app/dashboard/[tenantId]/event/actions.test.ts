import { describe, it, expect, vi } from "vitest";
import { readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateEvent } from "./actions";
import type { EventValues } from "./schema";

const blank = (): EventValues => ({
  title: "Spring Dance Weekend",
  year: 2026,
  location: "Grange Hall",
  date: "April 3-5",
  timezone: "America/Los_Angeles",
  calendar: { title: "", description: "", location: "", start: "", end: "" },
  contacts: { info: "", housing: "" },
  links: { info: "", health: "", safety: "" },
});

describe("updateEvent", () => {
  const harness = useActionHarness(createClient);
  const savedConfig = async () => (await readTenant(harness.service, harness.tenantId)).event_config;

  // Optional sub-objects/keys are omitted entirely when blank (rather than stored as ""), so
  // the registration app can treat "absent" as "not configured" without checking for "".
  it("omits the calendar, housing contact, and links when they're blank", async () => {
    expect(await updateEvent(harness.tenantId, blank())).toBeNull();
    expect(await savedConfig()).toEqual({
      title: "Spring Dance Weekend",
      year: 2026,
      location: "Grange Hall",
      date: "April 3-5",
      timezone: "America/Los_Angeles",
      contacts: { info: "" },
      links: {},
    });
  });

  it("stores the whole calendar block once any calendar field is filled in", async () => {
    const values = { ...blank(), calendar: { title: "SDW", description: "", location: "", start: "", end: "" } };
    await updateEvent(harness.tenantId, values);
    expect(await savedConfig()).toMatchObject({ calendar: values.calendar });
  });

  it("stores only the links and contacts that are filled in", async () => {
    await updateEvent(harness.tenantId, {
      ...blank(),
      contacts: { info: "info@example.org", housing: "housing@example.org" },
      links: { info: "https://example.org", health: "", safety: "https://example.org/safety" },
    });
    const config = await savedConfig();
    expect(config).toMatchObject({
      contacts: { info: "info@example.org", housing: "housing@example.org" },
      links: { info: "https://example.org", safety: "https://example.org/safety" },
    });
    expect(config).not.toHaveProperty("links.health");
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
