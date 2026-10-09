import { describe, it, expect, vi } from "vitest";
import { readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updateAppearance } from "./actions";
import type { ThemeConfig } from "@repo/tenant-config";

const theme = (): ThemeConfig => ({
  backgroundLight: "#ffffff",
  backgroundDark: "#111111",
  foregroundLight: "#222222",
  foregroundDark: "#eeeeee",
  accentLight: "#d97706",
  accentDark: "#f59e0b",
});

describe("updateAppearance", () => {
  const harness = useActionHarness(createClient);

  it("saves every color token as entered", async () => {
    expect(await updateAppearance(harness.tenantId, theme())).toBeNull();
    expect((await readTenant(harness.service, harness.tenantId)).theme_config).toEqual(theme());
  });

  itGuardsTheAction({
    harness, createClient, run: updateAppearance,
    validValues: theme,
    invalidValues: () => ({ ...theme(), accentLight: "orange" }),
  });
});
