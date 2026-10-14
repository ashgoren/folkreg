import { defaultRegistrationConfig } from "@repo/tenant-config";
import type { Person } from "@repo/types";
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

test("typing the registrant's email creates a draft order", async ({ page, tenantId }) => {
  await page.goto("/");

  await labelField(page, "First name").fill("Jane");
  await labelField(page, "Email").fill("jane@example.com");
  await labelField(page, "Email").blur();

  await expect
    .poll(
      async () => {
        const { data } = await service.from("orders").select("people").eq("tenant_id", tenantId).is("registered_at", null);
        return (data?.[0]?.people as Person[] | undefined)?.[0]?.email;
      },
      { message: "waiting for the debounced autosave to land", timeout: 5000 }
    )
    .toBe("jane@example.com");
});

test("continuing to edit updates the same draft rather than creating a second one", async ({ page, tenantId }) => {
  await page.goto("/");
  await labelField(page, "Email").fill("jane@example.com");
  await labelField(page, "Email").blur();
  await expect.poll(async () => (await service.from("orders").select("id").eq("tenant_id", tenantId)).data?.length, { timeout: 5000 }).toBe(1);

  await labelField(page, "First name").fill("Jane");
  await labelField(page, "First name").blur();

  await expect
    .poll(
      async () => {
        const { data } = await service.from("orders").select("people").eq("tenant_id", tenantId);
        return (data?.[0]?.people as Person[] | undefined)?.[0]?.first;
      },
      { timeout: 5000 }
    )
    .toBe("Jane");
  const { data } = await service.from("orders").select("id").eq("tenant_id", tenantId);
  expect(data).toHaveLength(1);
});

test("submitting a complete registration confirms the order and redirects to /payment", async ({ page, tenantId }) => {
  await page.goto("/");
  await fillRequiredFields(page);

  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/payment/);
  const { data } = await service.from("orders").select("*").eq("tenant_id", tenantId).not("registered_at", "is", null);
  expect(data).toHaveLength(1);
  expect(data![0]!.submission_mode).toBe("pay");
  expect(data![0]!.is_test).toBe(false);
});

test("reloading after registering still resumes without error, and resubmitting doesn't move registered_at", async ({ page, tenantId }) => {
  await page.goto("/");
  await fillRequiredFields(page);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/payment/);

  const before = await service.from("orders").select("registered_at").eq("tenant_id", tenantId).single();

  await page.goto("/");
  await expect(page.getByRole("group", { name: "You" })).toBeVisible();

  const after = await service.from("orders").select("registered_at").eq("tenant_id", tenantId).single();
  expect(after.data?.registered_at).toBe(before.data?.registered_at);
});
