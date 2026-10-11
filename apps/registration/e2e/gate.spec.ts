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

  await expect(page.getByText("Registration is open.")).toBeVisible();
});

test("a closing time that has passed closes registration", async ({ page, tenantId }) => {
  await setRegistration(tenantId, { opening: "now", closeAt: { enabled: true, at: "2020-01-01T12:00" } });

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Registration is closed." })).toBeVisible();
});

test("registration opened now shows the form", async ({ page, tenantId }) => {
  await setRegistration(tenantId, { opening: "now" });

  await page.goto("/");

  await expect(page.getByText("Registration is open.")).toBeVisible();
});

test("the closed page links to the event's website", async ({ page, tenantId }) => {
  await updateTenantConfig(service, tenantId, {
    event_config: { ...defaultEventConfig(), links: { info: "https://springdance.org", health: "", safety: "" } },
  });

  await page.goto("/");

  await expect(page.getByRole("link", { name: "Visit the event website" })).toHaveAttribute("href", "https://springdance.org");
});
