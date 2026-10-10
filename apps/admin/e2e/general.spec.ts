import { test, expect, readTenantConfig, waitForSaved } from "./fixtures";
import { E2E_TENANT_SLUG, OTHER_TENANT_SLUG } from "../test/supabase";

test.beforeEach(async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("general"));
});

test("autosaves slug and toggles, and shows them after a reload", async ({ page, tenantId }) => {
  await page.getByLabel("Subdomain").fill("renamed-e2e");
  await page.getByRole("switch", { name: "Show preregistration?" }).click();
  await page.getByRole("switch", { name: "Live mode?" }).click();
  await page.getByRole("button", { name: "Go live" }).click(); // the confirmation
  // The badge and description follow the is_live toggle immediately, before any save.
  await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
  await expect(page.getByText("open", { exact: true })).toBeVisible();
  await waitForSaved(page);

  await expect.poll(async () => {
    const { slug, is_live, show_preregistration } = await readTenantConfig(tenantId);
    return { slug, is_live, show_preregistration };
  }).toEqual({ slug: "renamed-e2e", is_live: true, show_preregistration: true });

  await page.reload();
  await expect(page.getByLabel("Subdomain")).toHaveValue("renamed-e2e");
  await expect(page.getByRole("switch", { name: "Show preregistration?" })).toBeChecked();
  await expect(page.getByRole("switch", { name: "Live mode?" })).toBeChecked();
});

test("shows an inline error for an invalid slug and doesn't save it", async ({ page, tenantId }) => {
  await page.getByLabel("Subdomain").fill("Not A Slug");
  await page.getByLabel("Subdomain").blur();
  await expect(page.getByText("Lowercase letters, numbers, and hyphens only")).toBeVisible();

  // Asserting that a save *didn't* happen has no event to wait on; this outlasts a save's round
  // trip, so a save that was going to happen would have landed.
  await page.waitForTimeout(1500);
  expect((await readTenantConfig(tenantId)).slug).toBe(E2E_TENANT_SLUG);
});

test("shows a readable error when the slug belongs to another tenant", async ({ page, tenantId }) => {
  test.setTimeout(20_000);
  await page.getByLabel("Subdomain").fill(OTHER_TENANT_SLUG);
  await page.getByLabel("Subdomain").blur();
  // Scoped to sonner's toast element, so the assertion can only match the message as the
  // organizer sees it.
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "That slug is already taken" }))
    .toBeVisible({ timeout: 5_000 });
  expect((await readTenantConfig(tenantId)).slug).toBe(E2E_TENANT_SLUG);
});
