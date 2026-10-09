import { test, expect, readTenantConfig, waitForSaved, dragRowOnto } from "./fixtures";
import type { Page } from "@playwright/test";

const fieldsConfig = async (tenantId: string) => (await readTenantConfig(tenantId)).fields_config;

// An "Available fields" row is a <span>{name}</span> next to an "Add" button; an active row's
// select button is labelled by the field name, with the drag handle and remove button beside
// it in the same row element.
const addField = (page: Page, name: string) =>
  page.getByText(name, { exact: true }).locator("..").getByRole("button", { name: "Add" }).click();
const activeRow = (page: Page, name: string) => page.getByRole("button", { name, exact: true }).locator("..");

test.beforeEach(async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("fields"));
});

test("adding a field saves it with its default config", async ({ page, tenantId }) => {
  // With nothing active, the available list starts expanded.
  await addField(page, "first");
  await addField(page, "age");
  await waitForSaved(page);

  await expect.poll(() => fieldsConfig(tenantId)).toEqual({
    contactOrder: ["first"],
    miscOrder: ["age"],
    config: {
      first: { label: "First name", width: 6 },
      age: {
        title: "Age",
        label: "Please choose one.",
        options: [
          { label: "Adult", value: "adult" },
          { label: "13-17 yr old", value: "13-17" },
          { label: "6-12 yr old", value: "6-12" },
          { label: "3-5 yr old", value: "3-5" },
          { label: "0-2 yr old", value: "0-2" },
        ],
        defaultValue: "adult",
      },
    },
  });
});

test("removing a field drops it from both the order and the config", async ({ page, tenantId }) => {
  await addField(page, "first");
  await addField(page, "last");
  await expect.poll(async () => (await fieldsConfig(tenantId))?.contactOrder).toEqual(["first", "last"]);

  await activeRow(page, "last").getByRole("button", { name: "Remove field" }).click();
  await expect.poll(() => fieldsConfig(tenantId)).toEqual({
    contactOrder: ["first"],
    miscOrder: [],
    config: { first: { label: "First name", width: 6 } },
  });
  // It's back in the available list.
  await expect(page.getByText("last", { exact: true }).locator("..").getByRole("button", { name: "Add" })).toBeVisible();
});

test("editing a field in the config panel saves its config", async ({ page, tenantId }) => {
  await addField(page, "first");
  await activeRow(page, "first").getByRole("button", { name: "first", exact: true }).click();
  await expect(page.getByRole("heading", { name: "first" })).toBeVisible();

  await page.locator("#config-label-first").fill("Given name");
  // Addressed by id: the "Required" text beside this switch is a plain <span>, not a <label>
  // tied to it, so the switch has no accessible name to find it by.
  await page.locator("#config-required-first").click();
  await waitForSaved(page);

  await expect.poll(async () => (await fieldsConfig(tenantId))?.config.first)
    .toEqual({ label: "Given name", width: 6, required: true });

  await page.reload();
  // A required field's row label gains a "*" (no space), so its button name becomes "first*".
  await page.getByRole("button", { name: "first*", exact: true }).click();
  await expect(page.locator("#config-label-first")).toHaveValue("Given name");
});

test("dragging a row reorders the contact fields", async ({ page, tenantId }) => {
  await addField(page, "first");
  await addField(page, "last");
  await addField(page, "email");
  await expect.poll(async () => (await fieldsConfig(tenantId))?.contactOrder).toEqual(["first", "last", "email"]);

  await dragRowOnto(page, activeRow(page, "email").getByRole("button", { name: "Drag to reorder" }), activeRow(page, "first"));

  await expect.poll(async () => (await fieldsConfig(tenantId))?.contactOrder).toEqual(["email", "first", "last"]);

  await page.reload();
  const rowNames = page.getByRole("button", { name: /^(first|last|email)$/ });
  await expect(rowNames).toHaveText(["email", "first", "last"]);
});
