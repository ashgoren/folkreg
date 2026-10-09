import { test, expect, service, readTenantConfig, waitForSaved, dragRowOnto } from "./fixtures";
import type { Page } from "@playwright/test";

const spreadsheetConfig = async (tenantId: string) => (await readTenantConfig(tenantId)).spreadsheet_config;

// A column row is the grip handle, a <span>{name}</span>, and a show/hide toggle.
const columnRow = (page: Page, name: string) => page.getByText(name, { exact: true }).locator("..");

test.beforeEach(async ({ page, tenantId, dashboardUrl }) => {
  // The Spreadsheet page derives its available columns from the active fields, so the tenant
  // needs some before there's anything to configure.
  const { error } = await service.from("tenants").update({
    fields_config: {
      contactOrder: ["first", "last", "email", "emailConfirmation"],
      miscOrder: ["photo"],
      config: {},
    },
  }).eq("id", tenantId);
  if (error) throw error;

  await page.goto(dashboardUrl("spreadsheet"));
});

test("lists active fields (plus follow-ups) as columns, then the fixed system columns", async ({ page }) => {
  for (const name of ["first", "last", "email", "photo", "photoComments"]) {
    await expect(columnRow(page, name).getByRole("button", { name: "Hide column" })).toBeVisible();
  }
  // emailConfirmation is excluded via FieldDef.excludeFromSpreadsheet.
  await expect(page.getByText("emailConfirmation", { exact: true })).toHaveCount(0);
  // System columns are shown, but feature-gated ones are absent while their feature is off.
  await expect(page.getByText("total", { exact: true })).toBeVisible();
  await expect(page.getByText("key", { exact: true })).toBeVisible();
  await expect(page.getByText("waiver", { exact: true })).toHaveCount(0);
  await expect(page.getByText("deposit", { exact: true })).toHaveCount(0);
});

test("autosaves the sheet id and hidden columns", async ({ page, tenantId }) => {
  await page.getByLabel("Spreadsheet URL or ID").fill("https://docs.google.com/spreadsheets/d/abc123/edit");
  await columnRow(page, "last").getByRole("button", { name: "Hide column" }).click();
  await expect(columnRow(page, "last").getByRole("button", { name: "Show column" })).toBeVisible();
  await waitForSaved(page);

  // The URL is stored exactly as entered -- extracting the bare id is the Sheets sync's job.
  await expect.poll(() => spreadsheetConfig(tenantId)).toEqual({
    sheetId: "https://docs.google.com/spreadsheets/d/abc123/edit",
    columns: [
      { name: "first", visible: true },
      { name: "last", visible: false },
      { name: "email", visible: true },
      { name: "photo", visible: true },
      { name: "photoComments", visible: true },
    ],
  });

  await page.reload();
  await expect(page.getByLabel("Spreadsheet URL or ID")).toHaveValue("https://docs.google.com/spreadsheets/d/abc123/edit");
  await expect(columnRow(page, "last").getByRole("button", { name: "Show column" })).toBeVisible();
});

test("dragging a column reorders it", async ({ page, tenantId }) => {
  await dragRowOnto(page, columnRow(page, "photo").getByRole("button", { name: "Drag to reorder" }), columnRow(page, "first"));

  await expect.poll(async () => (await spreadsheetConfig(tenantId))?.columns.map((col) => col.name))
    .toEqual(["photo", "first", "last", "email", "photoComments"]);
});
