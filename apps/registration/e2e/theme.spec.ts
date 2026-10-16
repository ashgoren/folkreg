import type { Locator, Page } from "@playwright/test";
import { defaultEventConfig, defaultRegistrationConfig, defaultThemeConfig } from "@repo/tenant-config";
import { test, expect, service } from "./fixtures";
import { updateTenantConfig } from "../test/supabase";

// The default theme_config's page backgrounds, #ffffff light and #0a0a0a dark, as Chromium reports
// a computed color.
const LIGHT_BACKGROUND = "rgb(255, 255, 255)";
const DARK_BACKGROUND = "rgb(10, 10, 10)";

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

test("the tenant's own colors show in each mode, with readable text on its accent", async ({ page, tenantId }) => {
  await updateTenantConfig(service, tenantId, {
    registration_config: { ...defaultRegistrationConfig(), opening: "now" },
    theme_config: {
      ...defaultThemeConfig(),
      backgroundLight: "#fae1b7",
      accentLight: "#cc7a00",
      backgroundDark: "#2a1500",
      accentDark: "#f1a039",
    },
  });
  // The form's Save button is a primary button: the accent behind text chosen to contrast with it.
  const save = page.getByRole("button", { name: "Save" }).first();
  const textColorOf = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).color);

  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  expect(await bodyBackground(page)).toBe("rgb(250, 225, 183)");
  expect(await backgroundOf(save)).toBe("rgb(204, 122, 0)");

  await page.emulateMedia({ colorScheme: "dark" }); // auto, now on a dark OS
  await expect.poll(() => bodyBackground(page)).toBe("rgb(42, 21, 0)");
  // Polled: the button animates its colors (`transition-all`), so it takes a moment to arrive.
  await expect.poll(() => backgroundOf(save)).toBe("rgb(241, 160, 57)");
  await expect.poll(() => textColorOf(save)).toBe("rgb(10, 10, 10)"); // near-black on the bright orange
});

test("the header is the tenant's header color with readable text, or a tint when none is set", async ({ page, tenantId }) => {
  await updateTenantConfig(service, tenantId, {
    event_config: { ...defaultEventConfig(), title: "Spring Dance" },
    theme_config: { ...defaultThemeConfig(), headerLight: "", headerDark: "#1b5e20" },
  });
  const header = page.getByRole("banner");
  const title = page.getByRole("heading", { name: "Spring Dance" });
  const textColorOf = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).color);

  // Light mode has no header color: a tint of the accent, so neither the page's background nor
  // the accent itself.
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const tint = await backgroundOf(header);
  expect(tint).not.toBe(LIGHT_BACKGROUND);
  expect(tint).not.toBe("rgb(37, 99, 235)"); // the default accent, #2563eb
  expect(await textColorOf(title)).toBe("rgb(10, 10, 10)"); // the page's own text

  // Dark mode's header is dark green, so its text turns white.
  await page.emulateMedia({ colorScheme: "dark" });
  await expect.poll(() => backgroundOf(header)).toBe("rgb(27, 94, 32)");
  await expect.poll(() => textColorOf(title)).toBe("rgb(255, 255, 255)");
});
