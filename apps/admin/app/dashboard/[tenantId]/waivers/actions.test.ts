import { describe, it, expect, vi } from "vitest";
import { readSecrets, readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateWaivers, updateWaiverSecrets } from "./actions";

// waiver_config is plain config on tenants; the API key is a credential in tenant_secrets. Each has
// its own action, which writes only its own table.

describe("updateWaivers", () => {
  const harness = useActionHarness(createClient);

  it("saves waiver_config, leaving the API key alone", async () => {
    await harness.service.from("tenant_secrets").update({ docuseal_key: "dk_keep" }).eq("tenant_id", harness.tenantId);
    expect(await updateWaivers(harness.tenantId, { show: true, docusealTemplateId: "tmpl_1" })).toBeNull();
    expect((await readTenant(harness.service, harness.tenantId)).waiver_config).toEqual({ show: true, docusealTemplateId: "tmpl_1" });
    expect((await readSecrets(harness.service, harness.tenantId)).docuseal_key).toBe("dk_keep");
  });

  // The config schema keeps only its own keys, so a key sent along with the config never reaches
  // the readable column.
  it("never stores an API key sent with the config", async () => {
    await updateWaivers(harness.tenantId, { show: true, docusealTemplateId: "tmpl_1", docuseal_key: "dk_secret" } as never);
    expect(JSON.stringify((await readTenant(harness.service, harness.tenantId)).waiver_config)).not.toContain("dk_secret");
  });

  it("stores a blank template id as \"\"", async () => {
    await updateWaivers(harness.tenantId, { show: false, docusealTemplateId: "" });
    expect((await readTenant(harness.service, harness.tenantId)).waiver_config).toEqual({ show: false, docusealTemplateId: "" });
  });

  itGuardsTheAction({
    harness, createClient, run: updateWaivers,
    validValues: () => ({ show: true, docusealTemplateId: "tmpl_1" }),
    invalidValues: () => ({ show: "yes" }),
  });
});

describe("updateWaiverSecrets", () => {
  const harness = useActionHarness(createClient);

  it("saves the API key, leaving waiver_config alone", async () => {
    const before = (await readTenant(harness.service, harness.tenantId)).waiver_config;
    expect(await updateWaiverSecrets(harness.tenantId, { docuseal_key: "dk_secret" })).toBeNull();
    expect((await readSecrets(harness.service, harness.tenantId)).docuseal_key).toBe("dk_secret");
    expect((await readTenant(harness.service, harness.tenantId)).waiver_config).toEqual(before);
  });

  // Unset is null in tenant_secrets.
  it("stores a blank API key as null", async () => {
    await updateWaiverSecrets(harness.tenantId, { docuseal_key: "dk_secret" });
    await updateWaiverSecrets(harness.tenantId, { docuseal_key: "" });
    expect((await readSecrets(harness.service, harness.tenantId)).docuseal_key).toBeNull();
  });

  itGuardsTheAction({
    harness, createClient, run: updateWaiverSecrets,
    validValues: () => ({ docuseal_key: "dk_secret" }),
    invalidValues: () => ({ docuseal_key: 5 }),
  });
});
