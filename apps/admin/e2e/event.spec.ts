import { test, expect, readTenantConfig, waitForSaved } from "./fixtures";

test.beforeEach(async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("event"));
});

test("autosaves event details, omitting the calendar block and blank links", async ({ page, tenantId }) => {
  // Several labels repeat across sections (e.g. "Title" for both the event and the calendar
  // entry), so fields are addressed by id.
  await page.locator("#event-title").fill("Fall Dance Weekend");
  await page.locator("#event-year").fill("2027");
  await page.locator("#event-location").fill("Example Hall, Portland, OR");
  await page.locator("#event-date").fill("October 1-3, 2027");
  await page.locator("#event-contact-info").fill("info@example.com");
  await page.locator("#event-link-safety").fill("https://example.com/safety");
  await waitForSaved(page);

  // updateEvent only includes `calendar` when at least one calendar field is filled in, and
  // only includes links that are non-blank.
  await expect.poll(async () => (await readTenantConfig(tenantId)).event_config).toEqual({
    title: "Fall Dance Weekend",
    year: 2027,
    location: "Example Hall, Portland, OR",
    date: "October 1-3, 2027",
    timezone: "America/Los_Angeles",
    contacts: { info: "info@example.com" },
    links: { safety: "https://example.com/safety" },
  });

  await page.reload();
  await expect(page.locator("#event-title")).toHaveValue("Fall Dance Weekend");
  await expect(page.locator("#event-year")).toHaveValue("2027");
  await expect(page.locator("#event-link-safety")).toHaveValue("https://example.com/safety");
});

test("includes the calendar block once any calendar field is filled", async ({ page, tenantId }) => {
  await page.locator("#event-cal-title").fill("Fall Dance Weekend");
  await waitForSaved(page);

  await expect.poll(async () => (await readTenantConfig(tenantId)).event_config?.calendar).toEqual({
    title: "Fall Dance Weekend",
    description: "",
    location: "",
    start: "",
    end: "",
  });
});

test("shows an inline error for a malformed info email", async ({ page }) => {
  await page.locator("#event-contact-info").fill("not-an-email");
  await page.locator("#event-contact-info").blur();
  await expect(page.getByText("Must be a valid email")).toBeVisible();
});
