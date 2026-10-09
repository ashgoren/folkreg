// Covers FieldsForm together with FieldRow and its use of ConfigPanel (whose per-type controls
// are tested directly in ConfigPanel.test.tsx). Drag-reordering active fields is covered by the
// Playwright e2e suite -- dnd-kit's pointer/geometry handling doesn't run in jsdom.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FIELD_DEFS } from "@repo/fields";
import { defaultFieldsConfig } from "@repo/tenant-config";
import { makeTenant } from "@/test/fixtures";
import { expectLastSave, expectNoSave } from "@/test/autosave";
import type { FieldsConfig } from "@repo/tenant-config";

vi.mock("./actions", () => ({ updateFields: vi.fn() }));
import { updateFields } from "./actions";
import { FieldsForm } from "./FieldsForm";

// An active field's row is the one with a "Remove field" button; its select button is named
// after the field.
const activeRow = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}\\b`) }).parentElement as HTMLElement;
const activeFieldNames = () =>
  screen.queryAllByRole("button", { name: "Remove field" }).map((remove) => remove.parentElement!.textContent!.replace("*", ""));
const availableRow = (name: string) => screen.getByText(name, { selector: "span" }).parentElement as HTMLElement;

const config: FieldsConfig = {
  contactOrder: ["first", "email"],
  miscOrder: ["carpool"],
  config: {
    first: { label: "First name", width: 6, required: true },
    email: { label: "Email", width: 6 },
    carpool: { title: "Transportation" },
  },
};

// What the page looks like once an organizer has deactivated every field.
const noneActive: FieldsConfig = { contactOrder: [], miscOrder: [], config: {} };

describe("FieldsForm", () => {
  beforeEach(() => {
    vi.mocked(updateFields).mockReset().mockResolvedValue(null);
  });

  describe("initial state", () => {
    it("starts a new tenant with the default field set active, contact fields first", () => {
      render(<FieldsForm tenant={makeTenant()} />);
      const { contactOrder, miscOrder } = defaultFieldsConfig();
      expect(activeFieldNames()).toEqual([...contactOrder, ...miscOrder]);
    });

    // Like the useAutosaveForm pages: stops Firefox (and sometimes Safari) restoring unsaved field
    // values on reload, which the page's state wouldn't know about.
    it("turns off the browser's restoring of field values on reload", () => {
      const { container } = render(<FieldsForm tenant={makeTenant()} />);
      expect(container.querySelector("form")).toHaveAttribute("autocomplete", "off");
    });

    it("opens the available-fields list when no fields are active", () => {
      render(<FieldsForm tenant={makeTenant({ fields_config: noneActive })} />);
      expect(activeFieldNames()).toEqual([]);
      expect(screen.getAllByRole("button", { name: "Add" })).toHaveLength(Object.keys(FIELD_DEFS).length);
      expect(screen.getByText("Select a field to configure it.")).toBeInTheDocument();
    });

    it("lists active contact and misc fields in stored order, and collapses the available list", async () => {
      const user = userEvent.setup();
      render(<FieldsForm tenant={makeTenant({ fields_config: config })} />);

      expect(activeFieldNames()).toEqual(["first", "email", "carpool"]);
      expect(screen.queryByRole("button", { name: "Add" })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /Available fields/ }));
      // Every field not already active is offered.
      expect(screen.getAllByRole("button", { name: "Add" })).toHaveLength(Object.keys(FIELD_DEFS).length - 3);
      expect(screen.queryByText("first", { selector: ".opacity-70 span" })).not.toBeInTheDocument();
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
        contactOrder: ["first"],
        miscOrder: [],
        config: { first: { label: "First name", width: 6 } },
      });
    });

    it("activates a misc field into the misc group, translating `value` defaults into defaultValue", async () => {
      const tenant = makeTenant({ fields_config: noneActive });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(within(availableRow("age")).getByRole("button", { name: "Add" }));

      const ageDefaults = FIELD_DEFS.age!.defaults!;
      await expectLastSave(vi.mocked(updateFields), tenant.id, {
        contactOrder: [],
        miscOrder: ["age"],
        config: { age: { label: ageDefaults.label, title: ageDefaults.title, options: ageDefaults.options, defaultValue: "adult" } },
      });
      // age ships with options, so it carries no missing-options warning.
      expect(activeRow("age").querySelector(".text-amber-500")).toBeNull();
    });

    it("appends each activated field to the end of its group", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(screen.getByRole("button", { name: /Available fields/ }));
      await user.click(within(availableRow("phone")).getByRole("button", { name: "Add" }));
      await user.click(within(availableRow("comments")).getByRole("button", { name: "Add" }));

      expect(activeFieldNames()).toEqual(["first", "email", "phone", "carpool", "comments"]);
      await expectLastSave(vi.mocked(updateFields), tenant.id, expect.objectContaining({
        contactOrder: ["first", "email", "phone"],
        miscOrder: ["carpool", "comments"],
      }));
    });

    it("deactivates a field, dropping its config and returning it to the available list", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(within(activeRow("email")).getByRole("button", { name: "Remove field" }));

      expect(activeFieldNames()).toEqual(["first", "carpool"]);
      await expectLastSave(vi.mocked(updateFields), tenant.id, {
        contactOrder: ["first"],
        miscOrder: ["carpool"],
        config: { first: config.config.first, carpool: config.config.carpool },
      });
      await user.click(screen.getByRole("button", { name: /Available fields/ }));
      expect(within(availableRow("email")).getByRole("button", { name: "Add" })).toBeInTheDocument();
    });

    it("closes the config panel when the selected field is deactivated", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(screen.getByRole("button", { name: /^email/ }));
      expect(screen.getByRole("heading", { name: "email" })).toBeInTheDocument();

      await user.click(within(activeRow("email")).getByRole("button", { name: "Remove field" }));
      expect(screen.queryByRole("heading", { name: "email" })).not.toBeInTheDocument();
      expect(screen.getByText("Select a field to configure it.")).toBeInTheDocument();
      await expectLastSave(vi.mocked(updateFields), tenant.id, expect.objectContaining({ contactOrder: ["first"] }));
    });
  });

  describe("configuring", () => {
    it("opens the selected field's config, using contact-group controls for contact fields", async () => {
      const user = userEvent.setup();
      render(<FieldsForm tenant={makeTenant({ fields_config: config })} />);

      await user.click(screen.getByRole("button", { name: /^first/ }));
      expect(screen.getByRole("heading", { name: "first" })).toBeInTheDocument();
      expect(screen.getByLabelText("Label")).toHaveValue("First name");
      expect(screen.getByText("Width")).toBeInTheDocument();
      expect(screen.queryByLabelText("Heading")).not.toBeInTheDocument();
    });

    it("uses misc-group controls for misc fields", async () => {
      const user = userEvent.setup();
      render(<FieldsForm tenant={makeTenant({ fields_config: config })} />);

      await user.click(screen.getByRole("button", { name: /^carpool/ }));
      expect(screen.getByLabelText("Heading")).toHaveValue("Transportation");
      expect(screen.queryByText("Width")).not.toBeInTheDocument();
    });

    // Like the other config pages: typing saves once, when the field loses focus.
    it("saves a typed config edit once, when the field loses focus, carrying the merged field config", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(screen.getByRole("button", { name: /^email/ }));
      await user.type(screen.getByLabelText("Placeholder"), "you@example.com");
      await expectNoSave(vi.mocked(updateFields));

      await user.tab();
      await expectLastSave(vi.mocked(updateFields), tenant.id, {
        ...config,
        config: { ...config.config, email: { label: "Email", width: 6, placeholder: "you@example.com" } },
      });
      expect(updateFields).toHaveBeenCalledTimes(1);
    });

    it("clears the missing-options warning once an option is added", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(screen.getByRole("button", { name: /^carpool/ }));
      await user.click(screen.getByRole("button", { name: /Add option/ }));

      expect(activeRow("carpool").querySelector(".text-amber-500")).toBeNull();
      await expectLastSave(vi.mocked(updateFields), tenant.id, expect.objectContaining({
        config: expect.objectContaining({ carpool: { title: "Transportation", options: [{ label: "", value: "" }] } }),
      }));
    });

    it("shows the required asterisk as soon as the toggle flips", async () => {
      const tenant = makeTenant({ fields_config: config });
      const user = userEvent.setup();
      render(<FieldsForm tenant={tenant} />);

      await user.click(screen.getByRole("button", { name: /^email/ }));
      await user.click(document.getElementById("config-required-email")!);

      expect(within(activeRow("email")).getByText("*")).toBeInTheDocument();
      await expectLastSave(vi.mocked(updateFields), tenant.id, expect.objectContaining({
        config: expect.objectContaining({ email: { label: "Email", width: 6, required: true } }),
      }));
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
