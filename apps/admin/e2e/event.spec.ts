import { defaultEventConfig } from "@repo/tenant-config";
import { test, expect, readTenantConfig, waitForSaved } from "./fixtures";

test.beforeEach(async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("event"));
});

test("autosaves event details, keeping untouched fields blank", async ({ page, tenantId }) => {
  // Fields are addressed by id. A date-time input takes its value as YYYY-MM-DDTHH:mm.
  await page.locator("#event-title").fill("Fall Dance Weekend");
  await page.locator("#event-start").fill("2027-10-01T19:00");
  await page.locator("#event-end").fill("2027-10-03T15:00");
  await page.locator("#event-location").fill("Example Hall, Portland, OR");
  await page.locator("#event-contact-info").fill("info@example.com");
  await page.locator("#event-link-safety").fill("https://example.com/safety");
  await waitForSaved(page);

  // The stored config is the form's values: what was typed, and "" for everything left blank.
  const defaults = defaultEventConfig();
  await expect.poll(async () => (await readTenantConfig(tenantId)).event_config).toEqual({
    ...defaults,
    title: "Fall Dance Weekend",
    start: "2027-10-01T19:00",
    end: "2027-10-03T15:00",
    location: "Example Hall, Portland, OR",
    contacts: { ...defaults.contacts, info: "info@example.com" },
    links: { ...defaults.links, safety: "https://example.com/safety" },
  });

  await page.reload();
  await expect(page.locator("#event-title")).toHaveValue("Fall Dance Weekend");
  await expect(page.locator("#event-start")).toHaveValue("2027-10-01T19:00");
  await expect(page.locator("#event-link-safety")).toHaveValue("https://example.com/safety");
});

test("saves a calendar field alongside the blank ones", async ({ page, tenantId }) => {
  await page.locator("#event-cal-location").fill("123 Main St, Portland, OR 97201");
  await waitForSaved(page);

  await expect.poll(async () => (await readTenantConfig(tenantId)).event_config.calendar).toEqual({
    show: false,
    description: "",
    location: "123 Main St, Portland, OR 97201",
  });
});

test("shows an inline error for a malformed info email", async ({ page }) => {
  await page.locator("#event-contact-info").fill("not-an-email");
  await page.locator("#event-contact-info").blur();
  await expect(page.getByText("Must be a valid email")).toBeVisible();
});
