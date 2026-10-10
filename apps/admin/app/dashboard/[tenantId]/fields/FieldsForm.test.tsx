// Covers FieldsForm together with FieldRow and its use of ConfigPanel (whose per-type controls
// are tested directly in ConfigPanel.test.tsx): what each gesture saves, and the panel following
// its field around the lists. Drag-reordering active fields is covered by the
// Playwright e2e suite -- dnd-kit's pointer/geometry handling doesn't run in jsdom.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FIELD_DEFS } from "@repo/fields";
import { defaultFieldEntry, defaultFieldsConfig } from "@repo/tenant-config";
import { makeTenant } from "@/test/fixtures";
import { expectLastSave, expectNoSave } from "@/test/autosave";
import type { FieldsConfig } from "@repo/tenant-config";

vi.mock("./actions", () => ({ updateFields: vi.fn() }));
import { updateFields } from "./actions";
import { FieldsForm } from "./FieldsForm";

// Rows are found by field key through data attributes, independent of what the row displays. An
// active row's select button is the one without an aria-label (the other two are "Drag to
// reorder" and "Remove field").
const activeRow = (name: string) => {
  const row = document.querySelector<HTMLElement>(`[data-active-field="${name}"]`);
  if (!row) throw new Error(`No active row for ${name}`);
  return row;
};
const selectButton = (name: string) =>
  within(activeRow(name)).getAllByRole("button").find((button) => !button.hasAttribute("aria-label"))!;
const activeFieldNames = () =>
  [...document.querySelectorAll("[data-active-field]")].map((row) => row.getAttribute("data-active-field"));
const availableRow = (name: string) => {
  const row = document.querySelector<HTMLElement>(`[data-available-field="${name}"]`);
  if (!row) throw new Error(`No available row for ${name}`);
  return row;
};

const first = { name: "first", label: "First name", width: 6, required: true } as const;
const email = { name: "email", label: "Email", width: 6 } as const;
const carpool = { name: "carpool", title: "Transportation" } as const;
const config: FieldsConfig = { contact: [first, email], misc: [carpool] };

// What the page looks like once an organizer has deactivated every field.
const noneActive: FieldsConfig = { contact: [], misc: [] };

describe("FieldsForm", () => {
  beforeEach(() => {
    vi.mocked(updateFields).mockReset().mockResolvedValue(null);
  });

  describe("initial state", () => {
    it("starts a new tenant with the default field set active, contact fields first", () => {
      render(<FieldsForm tenant={makeTenant()} />);
      const { contact, misc } = defaultFieldsConfig();
      expect(activeFieldNames()).toEqual([...contact, ...misc].map((field) => field.name));
    });

    // Like the useAutosaveForm pages: stops Firefox (and sometimes Safari) restoring unsaved field
    // values on reload, which the page's state wouldn't know about.
    it("turns off the browser's restoring of field values on reload", () => {
      const { container } = render(<FieldsForm tenant={makeTenant()} />);
      expect(container.querySelector("form")).toHaveAttribute("autocomplete", "off");
    });

    it("offers every field when none are active", () => {
      render(<FieldsForm tenant={makeTenant({ fields_config: noneActive })} />);
      expect(activeFieldNames()).toEqual([]);
      expect(screen.getAllByRole("button", { name: "Add" })).toHaveLength(Object.keys(FIELD_DEFS).length);
      expect(screen.getByText("Select a field to configure it.")).toBeInTheDocument();
    });

    it("lists active contact and misc fields in stored order, with the available list open", () => {
      render(<FieldsForm tenant={makeTenant({ fields_config: config })} />);

      expect(activeFieldNames()).toEqual(["first", "email", "carpool"]);
      // Every field not already active is offered.
      expect(screen.getAllByRole("button", { name: "Add" })).toHaveLength(Object.keys(FIELD_DEFS).length - 3);
      expect(document.querySelector('[data-available-field="first"]')).toBeNull();
    });

    it("marks required fields with an asterisk", () => {
      render(<FieldsForm tenant={makeTenant({ fields_config: config })} />);
      expect(within(activeRow("first")).getByText("*")).toBeInTheDocument();
      expect(within(activeRow("email")).queryByText("*")).not.toBeInTheDocument();
    });

    it("warns on radio/checkbox fields that have no options to choose from", () => {
      render(<FieldsForm tenant={makeTenant({ fields_config: config })} />);
      // carpool is a checkbox field with no options configured; the warning is an amber icon.
      expect(activeRow("carpool").querySelector(".text-amber-500")).not.toBeNull();
      expect(activeRow("email").querySelector(".text-amber-500")).toBeNull();
    });
  });

  describe("activating and deactivating", () => {
    it("activates a contact field into the contact group with its code-defined defaults, saving immediately", async () => {
      const tenant = makeTenant({ fields_config: noneActive });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(within(availableRow("first")).getByRole("button", { name: "Add" }));

      expect(activeFieldNames()).toEqual(["first"]);
      // A click is a complete gesture, so it's saved right away rather than on a blur.
      await expectLastSave(vi.mocked(updateFields), tenant.id, {
        contact: [{ name: "first", label: "First name", width: 6, required: true }],
        misc: [],
      });
    });

    it("activates a misc field into the misc group, translating `value` defaults into defaultValue", async () => {
      const tenant = makeTenant({ fields_config: noneActive });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(within(availableRow("age")).getByRole("button", { name: "Add" }));

      const ageDefaults = FIELD_DEFS.age.defaults!;
      await expectLastSave(vi.mocked(updateFields), tenant.id, {
        contact: [],
        misc: [{ name: "age", label: ageDefaults.label, title: ageDefaults.title, options: ageDefaults.options, defaultValue: "adult", required: true }],
      });
      // age ships with options, so it carries no missing-options warning.
      expect(activeRow("age").querySelector(".text-amber-500")).toBeNull();
    });

    it("appends each activated field to the end of its group", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(within(availableRow("phone")).getByRole("button", { name: "Add" }));
      await user.click(within(availableRow("comments")).getByRole("button", { name: "Add" }));

      expect(activeFieldNames()).toEqual(["first", "email", "phone", "carpool", "comments"]);
      await expectLastSave(vi.mocked(updateFields), tenant.id, {
        contact: [first, email, expect.objectContaining({ name: "phone" })],
        misc: [carpool, expect.objectContaining({ name: "comments" })],
      });
    });

    // Removing a field deletes its settings, so adding it back starts over from the same entry a
    // new tenant gets (including being on the nametag, for fields that can be).
    it("re-activates a removed field with fresh defaults", async () => {
      const tenant = makeTenant({ fields_config: { contact: [{ name: "last", label: "Surname" }], misc: [] } });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(within(activeRow("last")).getByRole("button", { name: "Remove field" }));
      await user.click(within(availableRow("last")).getByRole("button", { name: "Add" }));

      await expectLastSave(vi.mocked(updateFields), tenant.id, { contact: [defaultFieldEntry("last")], misc: [] });
      expect(defaultFieldEntry("last")).toMatchObject({ includeOnNametag: true });
    });

    it("deactivates a field, dropping its config and returning it to the available list", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(within(activeRow("email")).getByRole("button", { name: "Remove field" }));

      expect(activeFieldNames()).toEqual(["first", "carpool"]);
      await expectLastSave(vi.mocked(updateFields), tenant.id, { contact: [first], misc: [carpool] });
      expect(within(availableRow("email")).getByRole("button", { name: "Add" })).toBeInTheDocument();
    });

    it("closes the config panel when the selected field is deactivated", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(selectButton("email"));
      expect(screen.getByRole("heading", { name: "email" })).toBeInTheDocument();

      await user.click(within(activeRow("email")).getByRole("button", { name: "Remove field" }));
      expect(screen.queryByRole("heading", { name: "email" })).not.toBeInTheDocument();
      expect(screen.getByText("Select a field to configure it.")).toBeInTheDocument();
      await expectLastSave(vi.mocked(updateFields), tenant.id, expect.objectContaining({ contact: [first] }));
    });
  });

  describe("configuring", () => {
    it("opens the selected field's config, using contact-group controls for contact fields", async () => {
      const user = userEvent.setup();
      render(<FieldsForm tenant={makeTenant({ fields_config: config })} />);

      await user.click(selectButton("first"));
      expect(screen.getByRole("heading", { name: "first" })).toBeInTheDocument();
      expect(screen.getByLabelText("Label")).toHaveValue("First name");
      expect(screen.getByText("Width")).toBeInTheDocument();
      expect(screen.queryByLabelText("Heading")).not.toBeInTheDocument();
    });

    it("uses misc-group controls for misc fields", async () => {
      const user = userEvent.setup();
      render(<FieldsForm tenant={makeTenant({ fields_config: config })} />);

      await user.click(selectButton("carpool"));
      expect(screen.getByLabelText("Heading")).toHaveValue("Transportation");
      expect(screen.queryByText("Width")).not.toBeInTheDocument();
    });

    // Like the other config pages: typing saves once, when the field loses focus.
    it("saves a typed config edit once, when the field loses focus, carrying the merged field config", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(selectButton("email"));
      await user.type(screen.getByLabelText("Placeholder"), "you@example.com");
      await expectNoSave(vi.mocked(updateFields));

      await user.tab();
      await expectLastSave(vi.mocked(updateFields), tenant.id, {
        contact: [first, { ...email, placeholder: "you@example.com" }],
        misc: [carpool],
      });
      expect(updateFields).toHaveBeenCalledTimes(1);
    });

    it("clears the missing-options warning once an option is added", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(selectButton("carpool"));
      await user.click(screen.getByRole("button", { name: /Add option/ }));

      expect(activeRow("carpool").querySelector(".text-amber-500")).toBeNull();
      await expectLastSave(vi.mocked(updateFields), tenant.id, expect.objectContaining({
        misc: [{ ...carpool, options: [{ label: "", value: "" }] }],
      }));
    });

    // The panel is bound to the field's place in its list, which a removal above it changes.
    it("keeps editing the selected field after a field above it is removed", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(selectButton("email"));
      await user.click(within(activeRow("first")).getByRole("button", { name: "Remove field" }));
      expect(screen.getByLabelText("Label")).toHaveValue("Email");

      await user.type(screen.getByLabelText("Placeholder"), "you@example.com");
      await user.tab();
      await expectLastSave(vi.mocked(updateFields), tenant.id, {
        contact: [{ ...email, placeholder: "you@example.com" }],
        misc: [carpool],
      });
    });

    it("shows the required asterisk as soon as the toggle flips", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(selectButton("email"));
      await user.click(document.getElementById("config-required-email")!);

      expect(within(activeRow("email")).getByText("*")).toBeInTheDocument();
      await expectLastSave(vi.mocked(updateFields), tenant.id, expect.objectContaining({
        contact: [first, { ...email, required: true }],
      }));
    });
  });

  describe("invalid settings", () => {
    const widthInput = () => screen.getByText("Width").nextElementSibling as HTMLInputElement;

    it("shows an error under an out-of-range width, and doesn't save it", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(selectButton("email"));
      await user.clear(widthInput());
      await user.type(widthInput(), "13");
      await user.tab();

      expect(await screen.findByText("Must be a whole number from 1 to 12")).toBeInTheDocument();
      await expectNoSave(vi.mocked(updateFields));
    });

    it("saves a cleared width as no width at all", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(selectButton("email"));
      await user.clear(widthInput());
      await user.tab();

      // Sent as width: undefined, which the JSON column doesn't store.
      await expectLastSave(vi.mocked(updateFields), tenant.id, { contact: [first, { name: "email", label: "Email" }], misc: [carpool] });
    });

    // Another field's panel would hide the error while it still blocked every save.
    it("keeps the invalid field's panel open until it's fixed", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(selectButton("email"));
      await user.clear(widthInput());
      await user.type(widthInput(), "13");
      await user.click(selectButton("first"));

      // The switch waits on validation, so give it time to (not) happen.
      await expectNoSave(vi.mocked(updateFields));
      expect(screen.getByRole("heading", { name: "email" })).toBeInTheDocument();
      expect(screen.getByText("Must be a whole number from 1 to 12")).toBeInTheDocument();

      await user.clear(widthInput());
      await user.type(widthInput(), "4");
      await user.click(selectButton("first"));

      expect(await screen.findByRole("heading", { name: "first" })).toBeInTheDocument();
      await expectLastSave(vi.mocked(updateFields), tenant.id, { contact: [first, { ...email, width: 4 }], misc: [carpool] });
    });
  });

  describe("group sections", () => {
    it("collapse and expand independently", async () => {
      const user = userEvent.setup();
      render(<FieldsForm tenant={makeTenant({ fields_config: config })} />);

      await user.click(screen.getByRole("button", { name: "Contact" }));
      expect(activeFieldNames()).toEqual(["carpool"]);

      await user.click(screen.getByRole("button", { name: "Misc" }));
      expect(activeFieldNames()).toEqual([]);

      await user.click(screen.getByRole("button", { name: "Contact" }));
      expect(activeFieldNames()).toEqual(["first", "email"]);
    });
  });
});
