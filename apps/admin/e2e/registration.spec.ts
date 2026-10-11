import { defaultRegistrationConfig } from "@repo/tenant-config";
import { test, expect, readTenantConfig, waitForSaved } from "./fixtures";

test.beforeEach(async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("registration"));
});

test("schedules a lottery's opening once confirmed, and keeps its settings across a reload", async ({ page, tenantId }) => {
  // A date-time input takes its value as YYYY-MM-DDTHH:mm.
  await page.locator("#registration-opens-at").fill("2027-11-01T12:00");
  await page.locator("#registration-opens-at").blur();
  await page.getByRole("radio", { name: "Opens on" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("starting November 1, 2027 at 12:00 PM PDT");
  await page.getByRole("button", { name: "Open registration" }).click();
  await page.getByRole("checkbox", { name: "Close at" }).click();
  await page.locator("#registration-close-at-time").fill("2027-11-15T12:00");
  await page.getByRole("radio", { name: "Enter the lottery" }).click();
  await page.getByRole("switch", { name: "Show preregistration?" }).click();
  await page.locator("#registration-lottery-results").fill("2027-11-20");
  await page.locator("#registration-lottery-results").blur();
  await waitForSaved(page);

  await expect.poll(async () => (await readTenantConfig(tenantId)).registration_config).toEqual({
    ...defaultRegistrationConfig(),
    opening: "scheduled",
    opensAt: "2027-11-01T12:00",
    closeAt: { enabled: true, at: "2027-11-15T12:00" },
    mode: "lottery",
    lotteryResultsDate: "2027-11-20",
    showPreregistration: true,
  });

  await page.reload();
  await expect(page.getByRole("radio", { name: "Opens on" })).toBeChecked();
  await expect(page.locator("#registration-opens-at")).toHaveValue("2027-11-01T12:00");
  await expect(page.getByRole("checkbox", { name: "Close at" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Enter the lottery" })).toBeChecked();
  await expect(page.getByRole("switch", { name: "Show preregistration?" })).toBeChecked();
  await expect(page.getByText("Opens November 1, 2027 at 12:00 PM PDT")).toBeVisible();
});

test("turns a closing time off, keeping the time for later", async ({ page, tenantId }) => {
  await page.getByRole("checkbox", { name: "Close at" }).click();
  await page.locator("#registration-close-at-time").fill("2027-11-15T12:00");
  await page.locator("#registration-close-at-time").blur();
  await expect.poll(async () => (await readTenantConfig(tenantId)).registration_config.closeAt).toEqual({ enabled: true, at: "2027-11-15T12:00" });

  await page.getByRole("checkbox", { name: "Close at" }).click();

  await expect.poll(async () => (await readTenantConfig(tenantId)).registration_config.closeAt).toEqual({ enabled: false, at: "2027-11-15T12:00" });
  await page.reload();
  await expect(page.locator("#registration-close-at-time")).toHaveValue("2027-11-15T12:00");
});
