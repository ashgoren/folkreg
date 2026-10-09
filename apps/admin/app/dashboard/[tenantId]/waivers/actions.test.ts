import { describe, it, expect, vi } from "vitest";
import { readSecrets, readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateWaivers } from "./actions";

describe("updateWaivers", () => {
  const harness = useActionHarness(createClient);

  // waiver_config is plain config on tenants; the API key is a credential, so it goes to
  // tenant_secrets instead.
  it("splits the template ID into waiver_config and the API key into tenant_secrets", async () => {
    expect(await updateWaivers(harness.tenantId, { show: true, docusealTemplateId: "tmpl_1", docuseal_key: "dk_secret" })).toBeNull();
    expect((await readTenant(harness.service, harness.tenantId)).waiver_config).toEqual({ show: true, docusealTemplateId: "tmpl_1" });
    expect((await readSecrets(harness.service, harness.tenantId)).docuseal_key).toBe("dk_secret");
  });

  it("never copies the API key into the readable config column", async () => {
    await updateWaivers(harness.tenantId, { show: true, docusealTemplateId: "tmpl_1", docuseal_key: "dk_secret" });
    expect(JSON.stringify((await readTenant(harness.service, harness.tenantId)).waiver_config)).not.toContain("dk_secret");
  });

  it("stores blank or omitted DocuSeal values as null", async () => {
    await updateWaivers(harness.tenantId, { show: true, docusealTemplateId: "tmpl_1", docuseal_key: "dk_secret" });
    await updateWaivers(harness.tenantId, { show: false, docusealTemplateId: "" });
    expect((await readTenant(harness.service, harness.tenantId)).waiver_config).toEqual({ show: false, docusealTemplateId: null });
    expect((await readSecrets(harness.service, harness.tenantId)).docuseal_key).toBeNull();
  });

  itGuardsTheAction({
    harness, createClient, run: updateWaivers,
    validValues: () => ({ show: true, docusealTemplateId: "tmpl_1", docuseal_key: "dk_secret" }),
    invalidValues: () => ({ show: "yes" }),
  });
});
