import { test, expect, readTenantConfig, waitForSaved } from "./fixtures";

test.beforeEach(async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("receipts"));
});

test("autosaves addresses, storing a blank one as null", async ({ page, tenantId }) => {
  await page.getByLabel("From address").fill("tickets@example.com");
  await waitForSaved(page);

  await expect.poll(async () => (await readTenantConfig(tenantId)).receipts_config)
    .toEqual({ emailFrom: "tickets@example.com", emailReplyTo: null });

  await page.reload();
  await expect(page.getByLabel("From address")).toHaveValue("tickets@example.com");
  await expect(page.getByLabel("Reply-to address (if different)")).toHaveValue("");
});

test("shows an inline error for a malformed address", async ({ page }) => {
  const replyTo = page.getByLabel("Reply-to address (if different)");
  await replyTo.fill("nope");
  await replyTo.blur();
  await expect(page.getByText("Must be a valid email")).toBeVisible();
});
