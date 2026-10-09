import { defaultAdmissionsConfig } from "@repo/tenant-config";
import { test, expect, readTenantConfig, waitForSaved } from "./fixtures";

const admissionsConfig = async (tenantId: string) => (await readTenantConfig(tenantId)).admissions_config;

test.beforeEach(async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("admissions"));
});

// Switching only changes `mode`: the shared limits and every other mode's values stay saved, so an
// accidental switch loses nothing even across a reload.
test("switching mode keeps the shared limits and the other modes' values", async ({ page, tenantId }) => {
  // A new tenant starts in sliding-scale mode, with its default prices saved.
  await expect(page.getByRole("radio", { name: "Sliding scale" })).toBeChecked();
  await page.getByLabel("Max number of tickets registrant can purchase").fill("6");

  await page.getByRole("radio", { name: "Fixed" }).click();
  await page.getByLabel("Cost").fill("75");
  await waitForSaved(page);

  await expect.poll(() => admissionsConfig(tenantId)).toEqual({
    ...defaultAdmissionsConfig(),
    mode: "fixed",
    cost: 75,
    admissionQuantityMax: 6,
  });

  await page.reload();
  await expect(page.getByRole("radio", { name: "Fixed" })).toBeChecked();
  await expect(page.getByLabel("Cost")).toHaveValue("75");
  await expect(page.getByLabel("Max number of tickets registrant can purchase")).toHaveValue("6");
  await page.getByRole("radio", { name: "Sliding scale" }).click();
  await expect(page.getByLabel("Default")).toHaveValue("350");
});

test("a sliding-scale default outside the range shows an error and isn't saved", async ({ page, tenantId }) => {
  await page.getByLabel("Default").fill("600");
  await page.getByLabel("Default").blur();
  await expect(page.getByText("Must be between minimum and maximum")).toBeVisible();

  // No event signals a save that didn't happen; this outlasts the debounce plus a round trip.
  await page.waitForTimeout(1500);
  expect(await admissionsConfig(tenantId)).toEqual(defaultAdmissionsConfig());

  await page.getByLabel("Maximum").fill("700");
  await expect.poll(() => admissionsConfig(tenantId)).toMatchObject({
    mode: "sliding-scale",
    costRange: [120, 700],
    costDefault: 600,
  });
});

test("tiered mode saves categories with their age groups and prices", async ({ page, tenantId }) => {
  await page.getByRole("radio", { name: "Tiered" }).click();
  await page.getByLabel("Early-bird cutoff").fill("2027-09-01");
  await page.getByRole("button", { name: "Add category" }).click();
  await page.locator("#admissions-category-label-0").fill("Basic");
  await page.getByRole("checkbox", { name: "Adult" }).click();
  await page.getByRole("checkbox", { name: "13-17 yr old" }).click();
  await page.locator("#admissions-category-early-0").fill("80");
  await page.locator("#admissions-category-later-0").fill("100");
  await page.getByRole("switch", { name: "Force waitlist mode?" }).click();
  await waitForSaved(page);

  await expect.poll(() => admissionsConfig(tenantId)).toEqual({
    ...defaultAdmissionsConfig(),
    mode: "tiered",
    earlybirdCutoff: "2027-09-01",
    categories: [{ label: "Basic", ageGroups: ["adult", "13-17"], early: 80, later: 100 }],
    forceWaitlist: true,
  });

  await page.reload();
  await expect(page.getByRole("radio", { name: "Tiered" })).toBeChecked();
  await expect(page.locator("#admissions-category-label-0")).toHaveValue("Basic");
  await expect(page.getByRole("checkbox", { name: "Adult" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "0-2 yr old" })).not.toBeChecked();

  await page.getByRole("button", { name: "Remove category" }).click();
  await expect.poll(() => admissionsConfig(tenantId)).toMatchObject({ mode: "tiered", categories: [] });
});
