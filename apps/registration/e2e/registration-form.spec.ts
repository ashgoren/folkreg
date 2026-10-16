import { defaultRegistrationConfig } from "@repo/tenant-config";
import { test, expect, service } from "./fixtures";
import { updateTenantConfig } from "../test/supabase";

test.beforeEach(async ({ tenantId }) => {
  // resetTenant (the tenantId fixture) only restores config columns -- orders from a previous run
  // of this spec persist in local Supabase and would otherwise pollute these tenant-wide counts.
  await service.from("orders").delete().eq("tenant_id", tenantId);
  await updateTenantConfig(service, tenantId, { registration_config: { ...defaultRegistrationConfig(), opening: "now" } });
});

// Field labels get an aria-hidden "*" appended for required fields, which Chromium's accessible-name
// computation still includes -- and a plain substring match (exact: false) would also catch "Confirm
// email"/"Include my email in the roster" when looking for "Email". Anchoring with a regex pins the
// match to exactly one label, tolerating the optional asterisk.
const labelField = (page: import("@playwright/test").Page, label: string) =>
  page.getByLabel(new RegExp(`^${label}\\*?$`));

const fillRequiredFields = async (page: import("@playwright/test").Page) => {
  await labelField(page, "First name").fill("Jane");
  await labelField(page, "Last name").fill("Doe");
  await labelField(page, "Name for roster").fill("Jane");
  await labelField(page, "Email").fill("jane@example.com");
  await labelField(page, "Confirm email").fill("jane@example.com");
  await labelField(page, "Phone").fill("555-555-5555");
  await labelField(page, "Street address").fill("123 Main St");
  await labelField(page, "City").fill("Springfield");
  await page.getByRole("combobox", { name: "State / Province" }).click();
  await page.getByRole("option", { name: "Oregon" }).click();
  await labelField(page, "Zip code").fill("97477");
  await page.getByRole("checkbox", { name: "Yes" }).check();
};

// The draft lives in the tab's sessionStorage, which a reload keeps -- and nothing reaches the
// database until the registration is submitted.
test("reloading keeps what's been typed, without creating an order", async ({ page, tenantId }) => {
  await page.goto("/");
  await labelField(page, "First name").fill("Jane");
  await page.getByRole("checkbox", { name: "Yes" }).check();

  await page.reload();

  await expect(labelField(page, "First name")).toHaveValue("Jane");
  await expect(page.getByRole("checkbox", { name: "Yes" })).toBeChecked();
  const { data } = await service.from("orders").select("id").eq("tenant_id", tenantId);
  expect(data).toHaveLength(0);
});

// A new tab gets its own empty sessionStorage, so it's a new registration.
test("a new tab starts a blank form", async ({ page, context }) => {
  await page.goto("/");
  await labelField(page, "First name").fill("Jane");

  const newTab = await context.newPage();
  await newTab.goto("/");

  await expect(labelField(newTab, "First name")).toHaveValue("");
});

test("submitting a complete registration confirms the order and redirects to /payment", async ({ page, tenantId }) => {
  await page.goto("/");
  await fillRequiredFields(page);
  await page.getByRole("button", { name: "Save" }).click();

  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/payment/);
  const { data } = await service.from("orders").select("*").eq("tenant_id", tenantId).not("registered_at", "is", null);
  expect(data).toHaveLength(1);
  expect(data![0]!.submission_mode).toBe("pay");
  expect(data![0]!.is_test).toBe(false);
});
