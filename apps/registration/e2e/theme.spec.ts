import type { Locator, Page } from "@playwright/test";
import { defaultRegistrationConfig } from "@repo/tenant-config";
import { test, expect, service } from "./fixtures";
import { updateTenantConfig } from "../test/supabase";

// globals.css's background token: oklch(1 0 0) light, oklch(0.145 0 0) dark. Chromium reports the
// computed color in the same oklch() form.
const LIGHT_BACKGROUND = "oklch(1 0 0)";
const DARK_BACKGROUND = "oklch(0.145 0 0)";

const bodyBackground = (page: Page) => page.locator("body").evaluate((body) => getComputedStyle(body).backgroundColor);
const backgroundOf = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).backgroundColor);

const setThemeCookie = (page: Page, value: "light" | "dark") =>
  page.context().addCookies([{ name: "theme", value, url: "http://registration-test-tenant.localhost:3000" }]);

test.describe("rendered by the server", () => {
  // No JavaScript at all: whatever shows is the HTML and CSS the server sent, before hydration.
  test.use({ javaScriptEnabled: false });

  test("a saved choice is on the page as it arrives", async ({ page }) => {
    await setThemeCookie(page, "dark");
    await page.emulateMedia({ colorScheme: "light" });

    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await bodyBackground(page)).toBe(DARK_BACKGROUND);
  });

  test("with no saved choice the page follows the OS setting", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });

    await page.goto("/");

    await expect(page.locator("html")).not.toHaveAttribute("data-theme");
    expect(await bodyBackground(page)).toBe(DARK_BACKGROUND);
  });
});

test("auto keeps following the OS setting while the page is open", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  expect(await bodyBackground(page)).toBe(LIGHT_BACKGROUND);

  await page.emulateMedia({ colorScheme: "dark" });

  await expect.poll(() => bodyBackground(page)).toBe(DARK_BACKGROUND);
});

test("a chosen theme overrides the OS setting and survives a reload", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /theme: auto/i });

  await toggle.click(); // auto -> light

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect.poll(() => bodyBackground(page)).toBe(LIGHT_BACKGROUND);

  await page.reload();

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: /theme: light/i })).toBeVisible();
  expect(await bodyBackground(page)).toBe(LIGHT_BACKGROUND);
});

test("a change in one tab reaches the site's other open tabs", async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const otherTab = await context.newPage();
  await otherTab.emulateMedia({ colorScheme: "light" });
  await otherTab.goto("/");

  await page.getByRole("button", { name: /theme: auto/i }).click(); // auto -> light
  await page.getByRole("button", { name: /theme: light/i }).click(); // light -> dark

  await expect(otherTab.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(otherTab.getByRole("button", { name: /theme: dark/i })).toBeVisible();
});

test("dark: utilities follow the theme, including auto on a dark OS", async ({ page, tenantId }) => {
  await updateTenantConfig(service, tenantId, { registration_config: { ...defaultRegistrationConfig(), opening: "now" } });
  // Inputs are transparent in light mode and tinted by `dark:bg-input/30` in dark mode.
  const input = page.getByRole("textbox").first();

  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  expect(await backgroundOf(input)).toBe("rgba(0, 0, 0, 0)");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => backgroundOf(input)).not.toBe("rgba(0, 0, 0, 0)");

  await page.getByRole("button", { name: /theme: auto/i }).click(); // auto -> light, on a dark OS
  await expect.poll(() => backgroundOf(input)).toBe("rgba(0, 0, 0, 0)");
});
