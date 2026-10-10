import { describe, it, expect, vi } from "vitest";
import { readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateFields } from "./actions";
import type { FieldsConfig } from "@repo/tenant-config";

const config = (): FieldsConfig => ({
  contact: [
    { name: "first", label: "First name", width: 6, required: true },
    { name: "last", label: "Last name", width: 6, includeOnNametag: true },
    { name: "email", label: "Email", width: 12 },
  ],
  misc: [{ name: "age", title: "Age", options: [{ label: "Adult", value: "adult" }], defaultValue: "adult" }],
});

describe("updateFields", () => {
  const harness = useActionHarness(createClient);

  it("saves field order and per-field config", async () => {
    expect(await updateFields(harness.tenantId, config())).toBeNull();
    expect((await readTenant(harness.service, harness.tenantId)).fields_config).toEqual(config());
  });

  itGuardsTheAction({
    harness, createClient, run: updateFields,
    validValues: config,
    // A name the catalog doesn't define.
    invalidValues: () => ({ ...config(), contact: [{ name: "notAField" }] }),
  });
});
