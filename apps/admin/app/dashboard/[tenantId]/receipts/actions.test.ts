import { describe, it, expect, vi } from "vitest";
import { readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateReceipts } from "./actions";

describe("updateReceipts", () => {
  const harness = useActionHarness(createClient);
  const savedConfig = async () => (await readTenant(harness.service, harness.tenantId)).receipts_config;

  it("saves both addresses", async () => {
    expect(await updateReceipts(harness.tenantId, { emailFrom: "reg@example.org", emailReplyTo: "info@example.org" })).toBeNull();
    expect(await savedConfig()).toEqual({ emailFrom: "reg@example.org", emailReplyTo: "info@example.org" });
  });

  it("stores blank addresses as \"\"", async () => {
    await updateReceipts(harness.tenantId, { emailFrom: "", emailReplyTo: "" });
    expect(await savedConfig()).toEqual({ emailFrom: "", emailReplyTo: "" });
  });

  itGuardsTheAction({
    harness, createClient, run: updateReceipts,
    validValues: () => ({ emailFrom: "reg@example.org", emailReplyTo: "" }),
    invalidValues: () => ({ emailFrom: "nope", emailReplyTo: "" }),
  });
});
