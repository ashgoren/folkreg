import { defaultEventConfig, defaultRegistrationConfig, type RegistrationConfig } from "@repo/tenant-config";
import { test, expect, service } from "./fixtures";
import { updateTenantConfig } from "../test/supabase";

const setRegistration = (tenantId: string, overrides: Partial<RegistrationConfig>) =>
  updateTenantConfig(service, tenantId, { registration_config: { ...defaultRegistrationConfig(), ...overrides } });

test("a new tenant, never opened, shows the neutral closed message", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Registration is not currently available." })).toBeVisible();
});

test("a scheduled opening shows when it opens, on the event's clock", async ({ page, tenantId }) => {
  await setRegistration(tenantId, { opening: "scheduled", opensAt: "2099-12-01T12:00" });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Registration opens December 1, 2099 at 12:00 PM PST." })).toBeVisible();
});

test("a scheduled opening that has passed shows the form", async ({ page, tenantId }) => {
  await setRegistration(tenantId, { opening: "scheduled", opensAt: "2020-01-01T12:00" });

  await page.goto("/");

  await expect(page.getByRole("group", { name: "You" })).toBeVisible();
});

test("a closing time that has passed closes registration", async ({ page, tenantId }) => {
  await setRegistration(tenantId, { opening: "now", closeAt: { enabled: true, at: "2020-01-01T12:00" } });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Registration is closed." })).toBeVisible();
});

test("registration opened now shows the form", async ({ page, tenantId }) => {
  await setRegistration(tenantId, { opening: "now" });

  await page.goto("/");

  await expect(page.getByRole("group", { name: "You" })).toBeVisible();
});

test("the closed page links to the event's website", async ({ page, tenantId }) => {
  await updateTenantConfig(service, tenantId, {
    event_config: { ...defaultEventConfig(), links: { info: "https://springdance.org", health: "", safety: "" } },
  });

  await page.goto("/");

  await expect(page.getByRole("link", { name: "Visit the event website" })).toHaveAttribute("href", "https://springdance.org");
});

// Counts registered people in the tenant's current event year (the seeded tenant has no event
// dates, so that's this calendar year). Orders are removed again afterward, since other specs share
// this tenant.
test.describe("a people limit", () => {
  const addOrder = (tenantId: string, submissionMode: "pay" | "waitlist", registered: boolean) =>
    service.from("orders").insert({
      tenant_id: tenantId,
      event_year: new Date().getFullYear(),
      submission_mode: submissionMode,
      registered_at: registered ? new Date().toISOString() : null,
      people: [{ first: "Already", last: "Registered" }],
    });

  test.afterEach(async ({ tenantId }) => {
    await service.from("orders").delete().eq("tenant_id", tenantId);
  });

  test("that's been reached shows registration as full", async ({ page, tenantId }) => {
    await setRegistration(tenantId, { opening: "now", closeAfter: { enabled: true, people: 1 } });
    await addOrder(tenantId, "waitlist", true);

    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Registration is full." })).toBeVisible();
  });

  test("isn't reached by a pending pay-mode order", async ({ page, tenantId }) => {
    await setRegistration(tenantId, { opening: "now", closeAfter: { enabled: true, people: 1 } });
    await addOrder(tenantId, "pay", false);

    await page.goto("/");

    await expect(page.getByRole("group", { name: "You" })).toBeVisible();
  });
});
