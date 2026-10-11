import { defaultEventConfig } from "@repo/tenant-config";
import { test, expect, service } from "./fixtures";
import { updateTenantConfig } from "../test/supabase";

test("the page shows the tenant's event and names it in the title", async ({ page, tenantId }) => {
  await updateTenantConfig(service, tenantId, {
    event_config: { ...defaultEventConfig(), title: "Spring Dance", start: "2027-04-02T19:00", end: "2027-04-04T15:00" },
  });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Spring Dance" })).toBeVisible();
  await expect(page.getByText("April 2–4, 2027")).toBeVisible();
  await expect(page).toHaveTitle("Spring Dance Registration");
});

test("a tenant with no event title yet gets a generic title and no header", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Registration");
  await expect(page.getByRole("banner")).toHaveCount(0);
});
