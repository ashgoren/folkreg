import { defaultRegistrationConfig } from "@repo/tenant-config";
import { test, expect, readTenantConfig, waitForSaved } from "./fixtures";

test.beforeEach(async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("registration"));
});

test("autosaves a lottery's times and the open and preregistration switches, and keeps them across a reload", async ({ page, tenantId }) => {
  await page.getByRole("switch", { name: "Open" }).click();
  // A date-time input takes its value as YYYY-MM-DDTHH:mm.
  await page.locator("#registration-opens-at").fill("2027-11-01T12:00");
  await page.locator("#registration-closes-at").fill("2027-11-15T12:00");
  await page.getByRole("radio", { name: "Enter the lottery" }).click();
  await page.getByRole("switch", { name: "Show preregistration?" }).click();
  await page.locator("#registration-lottery-results").fill("2027-11-20");
  await page.locator("#registration-lottery-results").blur();
  await waitForSaved(page);

  await expect.poll(async () => (await readTenantConfig(tenantId)).registration_config).toEqual({
    ...defaultRegistrationConfig(),
    open: true,
    opensAt: "2027-11-01T12:00",
    closesAt: "2027-11-15T12:00",
    mode: "lottery",
    lotteryResultsDate: "2027-11-20",
    showPreregistration: true,
  });

  await page.reload();
  await expect(page.getByRole("switch", { name: "Open" })).toBeChecked();
  await expect(page.locator("#registration-opens-at")).toHaveValue("2027-11-01T12:00");
  await expect(page.getByRole("radio", { name: "Enter the lottery" })).toBeChecked();
  await expect(page.getByRole("switch", { name: "Show preregistration?" })).toBeChecked();
  await expect(page.getByText("Opens November 1, 2027 at 12:00 PM PDT")).toBeVisible();
});

test("clears a closing time back to none", async ({ page, tenantId }) => {
  await page.locator("#registration-closes-at").fill("2027-11-15T12:00");
  await page.locator("#registration-closes-at").blur();
  await expect.poll(async () => (await readTenantConfig(tenantId)).registration_config.closesAt).toBe("2027-11-15T12:00");

  await page.getByRole("button", { name: "Clear Closes" }).click();

  await expect(page.locator("#registration-closes-at")).toHaveValue("");
  await expect.poll(async () => (await readTenantConfig(tenantId)).registration_config.closesAt).toBe("");
});
