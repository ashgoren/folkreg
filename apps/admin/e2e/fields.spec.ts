import { defaultFieldsConfig } from "@repo/tenant-config";
import { test, expect, readTenantConfig, waitForSaved, dragRowOnto } from "./fixtures";
import type { Page } from "@playwright/test";

const fieldsConfig = async (tenantId: string) => (await readTenantConfig(tenantId)).fields_config;

// A new tenant starts with the default field set active, so these specs work from that: adding
// a field that isn't in it, removing and editing ones that are.
const defaults = defaultFieldsConfig();

// Rows are found by field key through data attributes. An active row holds the drag handle, the
// select button (the one without an aria-label, named by the field key plus "*" when required),
// and the remove button. The available list starts open.
const availableAddButton = (page: Page, name: string) =>
  page.locator(`[data-available-field="${name}"]`).getByRole("button", { name: "Add" });
const activeRow = (page: Page, name: string) => page.locator(`[data-active-field="${name}"]`);
const rowButton = (page: Page, name: string) => activeRow(page, name).locator("button:not([aria-label])");

test.beforeEach(async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("fields"));
});

test("adding a field saves it with its default config", async ({ page, tenantId }) => {
  await availableAddButton(page, "age").click();
  await waitForSaved(page);

  await expect.poll(() => fieldsConfig(tenantId)).toEqual({
    contact: defaults.contact,
    misc: [
      ...defaults.misc,
      {
        name: "age",
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
        firstPersonOptions: ["adult", "13-17"],
        required: true,
      },
    ],
  });
});

test("removing a field drops its entry, settings and all", async ({ page, tenantId }) => {
  await activeRow(page, "last").getByRole("button", { name: "Remove field" }).click();

  await expect.poll(() => fieldsConfig(tenantId)).toEqual({
    contact: defaults.contact.filter((field) => field.name !== "last"),
    misc: defaults.misc,
  });
  // It's back in the available list.
  await expect(availableAddButton(page, "last")).toBeVisible();
});

test("editing a field in the config panel saves its config", async ({ page, tenantId }) => {
  await rowButton(page, "first").click();
  await expect(page.getByRole("heading", { name: "first" })).toBeVisible();

  await page.locator("#config-label-first").fill("Given name");
  // Addressed by id: the "Required" text beside this switch is a plain <span>, not a <label>
  // tied to it, so the switch has no accessible name to find it by. First name starts required
  // (from its catalog defaults), so this click turns it off.
  await page.locator("#config-required-first").click();
  await waitForSaved(page);

  await expect.poll(async () => (await fieldsConfig(tenantId)).contact.find((field) => field.name === "first"))
    .toEqual({ name: "first", label: "Given name", width: 6, required: false });

  await page.reload();
  // No longer required, the row has no "*".
  await expect(rowButton(page, "first")).toHaveText("first");
  await rowButton(page, "first").click();
  await expect(page.locator("#config-label-first")).toHaveValue("Given name");
});

// Chromium allows "e" in a number input (for exponents); on its own it isn't a number. Firefox
// allows any text.
test("text in the width input that isn't a number shows an error and isn't saved", async ({ page, tenantId }) => {
  await rowButton(page, "first").click();
  const width = page.getByText("Width", { exact: true }).locator("xpath=following-sibling::input");
  await width.fill("");
  await width.pressSequentially("e");
  await width.press("Tab");

  await expect(page.getByText("Must be a whole number from 1 to 12")).toBeVisible();
  expect((await fieldsConfig(tenantId)).contact.find((field) => field.name === "first")).toMatchObject({ width: 6 });
});

// The roster's other details depend on the name: a new tenant shares everything by default.
test("unchecking the roster name as a default unchecks the rest; checking a detail rechecks it", async ({ page, tenantId }) => {
  const shareDefault = async () => (await fieldsConfig(tenantId)).misc.find((field) => field.name === "share")?.defaultValue;
  await rowButton(page, "share").click();
  const defaults = page.getByRole("group", { name: "Default" });
  const nameBox = defaults.getByRole("checkbox", { name: "Include my name in the roster" });

  await nameBox.click();
  await expect.poll(shareDefault).toEqual([]);

  await defaults.getByRole("checkbox", { name: "Include my email in the roster" }).click();
  await expect.poll(shareDefault).toEqual(["name", "email"]);
  await expect(nameBox).toBeChecked();
});

test("dragging a row reorders the contact fields", async ({ page, tenantId }) => {
  await dragRowOnto(page, activeRow(page, "email").getByRole("button", { name: "Drag to reorder" }), activeRow(page, "first"));

  const names = defaults.contact.map((field) => field.name);
  const expected = ["email", ...names.filter((name) => name !== "email")];
  await expect.poll(async () => (await fieldsConfig(tenantId)).contact.map((field) => field.name)).toEqual(expected);

  await page.reload();
  const contactRows = page.locator("[data-active-field]");
  await expect(contactRows.first()).toHaveAttribute("data-active-field", "email");
  await expect(contactRows.nth(1)).toHaveAttribute("data-active-field", "first");
  await expect(contactRows.nth(2)).toHaveAttribute("data-active-field", "last");
});
