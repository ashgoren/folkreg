import { test, expect, readTenantConfig, service, waitForSaved, type Section } from "./fixtures";
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

// Firefox (and sometimes Safari) restores typed values on reload without a change event, so a
// page would show values its form state doesn't know about. Every config page's form turns that off
// (autocomplete="off"), and no field may override it -- except SecretInput's "new-password", which
// keeps password managers from filling API key fields (browsers never restore password fields).
test("every config page turns off the browser's restoring of field values", async ({ page, dashboardUrl }) => {
  for (const { section } of SECTIONS) {
    await page.goto(dashboardUrl(section));
    const form = page.locator("main form");
    await expect(form).toHaveAttribute("autocomplete", "off");
    const overrides = await form.locator("input[autocomplete], textarea[autocomplete]").evaluateAll((fields) =>
      fields.map((field) => field.getAttribute("autocomplete")).filter((value) => value !== "off" && value !== "new-password"));
    expect(overrides, section).toEqual([]);
  }
});

test("the sidebar links to every config section", async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("general"));

  for (const { section, label } of SECTIONS) {
    await page.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(dashboardUrl(section));
    await expect(page.getByRole("heading", { level: 1, name: label })).toBeVisible();
  }
});

// KNOWN BUG: Back/forward navigation restores a page from the router's client-side cache, as it
// was first loaded -- before any edit made since. Back shows the old values, and the next
// autosave there writes that old copy of the page's config over the edit. Accepted for now (a
// single admin user, who can reload); fixing it means either invalidating the router cache on
// every save (revalidatePath, which visibly re-renders the page on each blur) or a version check
// that refuses stale saves (see the plan's Deferred section).
test.fail("Back after an edit shows the saved value, not the page as first loaded", async ({ page, tenantId, dashboardUrl }) => {
  await page.goto(dashboardUrl("event"));
  await page.locator("#event-title").fill("Edited before leaving");
  await waitForSaved(page);

  await page.getByRole("link", { name: "Receipts", exact: true }).click();
  await expect(page).toHaveURL(dashboardUrl("receipts"));
  await page.goBack();
  await expect(page).toHaveURL(dashboardUrl("event"));
  // Short timeout: the restored page renders right away, so a longer wait would only delay this
  // known failure.
  await expect(page.locator("#event-title")).toHaveValue("Edited before leaving", { timeout: 2_000 });

  // And editing there keeps the earlier edit rather than overwriting it.
  await page.locator("#event-location").fill("Grange Hall");
  await waitForSaved(page);
  await expect.poll(async () => (await readTenantConfig(tenantId)).event_config)
    .toMatchObject({ title: "Edited before leaving", location: "Grange Hall" });
});
