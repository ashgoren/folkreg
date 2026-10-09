import { describe, it, expect, vi } from "vitest";
import { readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateSpreadsheet } from "./actions";
import type { SpreadsheetValues } from "./schema";

const config = (): SpreadsheetValues => ({
  sheetId: "https://docs.google.com/spreadsheets/d/1AbC_dEf-123/edit",
  columns: [{ name: "email", visible: true }, { name: "first", visible: false }],
});

describe("updateSpreadsheet", () => {
  const harness = useActionHarness(createClient);

  // A pasted URL is stored un-normalized; the Sheets sync extracts the bare ID at use time.
  it("saves the sheet ID exactly as entered, with column order and visibility", async () => {
    expect(await updateSpreadsheet(harness.tenantId, config())).toBeNull();
    expect((await readTenant(harness.service, harness.tenantId)).spreadsheet_config).toEqual(config());
  });

  itGuardsTheAction({
    harness, createClient, run: updateSpreadsheet,
    validValues: config,
    invalidValues: () => ({ sheetId: "", columns: [{ name: "first" }] }),
  });
});
