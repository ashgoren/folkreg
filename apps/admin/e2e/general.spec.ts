import { test, expect, readTenantConfig, waitForSaved } from "./fixtures";
import { E2E_TENANT_SLUG, OTHER_TENANT_SLUG } from "../test/supabase";

test.beforeEach(async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("general"));
});

test("autosaves the switches, and shows them after a reload", async ({ page, tenantId }) => {
  await page.getByRole("switch", { name: "Show preregistration?" }).click();
  await page.getByRole("switch", { name: "Live mode?" }).click();
  await page.getByRole("button", { name: "Go live" }).click(); // the confirmation
  // The badge and description follow the is_live toggle immediately, before any save.
  await expect(page.getByText("LIVE", { exact: true })).toBeVisible();
  await expect(page.getByText("open", { exact: true })).toBeVisible();
  await waitForSaved(page);

  await expect.poll(async () => {
    const { is_live, show_preregistration } = await readTenantConfig(tenantId);
    return { is_live, show_preregistration };
  }).toEqual({ is_live: true, show_preregistration: true });

  await page.reload();
  await expect(page.getByRole("switch", { name: "Show preregistration?" })).toBeChecked();
  await expect(page.getByRole("switch", { name: "Live mode?" })).toBeChecked();
});

// The subdomain moves the registration site, so it saves only through Change, Save, and a confirmation.
test("moves the subdomain once confirmed", async ({ page, tenantId }) => {
  await expect(page.getByText(`${E2E_TENANT_SLUG}.folkreg.org`)).toBeVisible();
  await page.getByRole("button", { name: "Change" }).click();
  await page.getByLabel("Subdomain").fill("renamed-e2e");
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Move it" }).click();

  await expect(page.getByText("renamed-e2e.folkreg.org")).toBeVisible();
  await expect.poll(async () => (await readTenantConfig(tenantId)).slug).toBe("renamed-e2e");
  await page.reload();
  await expect(page.getByText("renamed-e2e.folkreg.org")).toBeVisible();
});

test("shows an inline error for an invalid subdomain and doesn't save it", async ({ page, tenantId }) => {
  await page.getByRole("button", { name: "Change" }).click();
  await page.getByLabel("Subdomain").fill("Not A Slug");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Lowercase letters, numbers, and hyphens only")).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  expect((await readTenantConfig(tenantId)).slug).toBe(E2E_TENANT_SLUG);
});

test("shows a readable error under the field when the subdomain belongs to another tenant", async ({ page, tenantId }) => {
  await page.getByRole("button", { name: "Change" }).click();
  await page.getByLabel("Subdomain").fill(OTHER_TENANT_SLUG);
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Move it" }).click();

  await expect(page.getByText("That subdomain is already taken")).toBeVisible();
  expect((await readTenantConfig(tenantId)).slug).toBe(E2E_TENANT_SLUG);
});
