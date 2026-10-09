import { test, expect, service, type Section } from "./fixtures";
import { OTHER_TENANT_SLUG, getTenantIdBySlug } from "../test/supabase";

const SECTIONS: { section: Section; label: string }[] = [
  { section: "general", label: "General" },
  { section: "event", label: "Event" },
  { section: "fields", label: "Fields" },
  { section: "admissions", label: "Admissions" },
  { section: "payments", label: "Payments" },
  { section: "waivers", label: "Waivers" },
  { section: "receipts", label: "Receipts" },
  { section: "spreadsheet", label: "Spreadsheet" },
  { section: "appearance", label: "Appearance" },
];

test("/ and /dashboard redirect a signed-in owner to their tenant's General page", async ({ page, dashboardUrl }) => {
  await page.goto("/");
  await expect(page).toHaveURL(dashboardUrl("general"));

  await page.goto("/dashboard");
  await expect(page).toHaveURL(dashboardUrl("general"));
});

// The layout's z.uuid() guard calls notFound(), but App Router renders a layout and its page
// concurrently, so the page's getPageTenant() query still runs with the malformed id and
// Postgres rejects it (22P02, logged by the dev server). The response is a 404 either way;
// this only asserts the status.
test("a non-UUID tenant id 404s", async ({ page }) => {
  const response = await page.goto("/dashboard/not-a-uuid/general");
  expect(response?.status()).toBe(404);
});

test("a well-formed but nonexistent tenant id 404s", async ({ page }) => {
  // RLS hides tenants the user doesn't own, so this also covers "someone else's tenant" --
  // getPageTenant sees no row either way and calls notFound().
  const response = await page.goto("/dashboard/00000000-0000-0000-0000-000000000000/general");
  expect(response?.status()).toBe(404);
});

test("another owner's tenant 404s", async ({ page }) => {
  const otherTenantId = await getTenantIdBySlug(service, OTHER_TENANT_SLUG);
  const response = await page.goto(`/dashboard/${otherTenantId}/general`);
  expect(response?.status()).toBe(404);
});

test("the sidebar links to every config section", async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("general"));

  for (const { section, label } of SECTIONS) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(dashboardUrl(section));
    await expect(page.getByRole("heading", { level: 1, name: label })).toBeVisible();
  }
});
