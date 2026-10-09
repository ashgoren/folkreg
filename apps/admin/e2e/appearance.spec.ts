import { test, expect, readTenantConfig, waitForSaved } from "./fixtures";

test.beforeEach(async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("appearance"));
});

test("autosaves a color, filling in defaults for the untouched ones", async ({ page, tenantId }) => {
  await page.locator("#appearance-backgroundLight").fill("#123456");
  await waitForSaved(page);

  await expect.poll(async () => (await readTenantConfig(tenantId)).theme_config).toEqual({
    backgroundLight: "#123456",
    foregroundLight: "#0a0a0a",
    accentLight: "#2563eb",
    backgroundDark: "#0a0a0a",
    foregroundDark: "#fafafa",
    accentDark: "#3b82f6",
  });

  await page.reload();
  await expect(page.locator("#appearance-backgroundLight")).toHaveValue("#123456");
  // The native color swatch mirrors the text input's value.
  await expect(page.getByLabel("Background swatch").first()).toHaveValue("#123456");
});

test("shows an inline error for a malformed hex color", async ({ page }) => {
  await page.locator("#appearance-accentDark").fill("#12");
  await page.locator("#appearance-accentDark").blur();
  await expect(page.getByText("Must be a hex color, e.g. #d97706")).toBeVisible();
});
