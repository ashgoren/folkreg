// ConfigPanel binds its controls to one field's entry in the Fields form (e.g. "misc.0.label"),
// so these tests render it inside a minimal react-hook-form form holding just that entry, with
// the same schema resolver and blur validation as the page, and read the entry back from the form.
// Which controls appear depends on the field's type and group, as defined in @repo/fields.

import { describe, it, expect } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FIELD_DEFS, MISC_FIELD_DEFS, type FieldName } from "@repo/fields";
import { fieldsConfigSchema, type FieldConfig, type FieldsConfig } from "@repo/tenant-config";
import { ConfigPanel } from "./ConfigPanel";

// Renders the panel for one field, returning a function that reads its entry's current values.
const renderPanel = (fieldName: FieldName, config: FieldConfig = {}) => {
  const group = FIELD_DEFS[fieldName].group;
  const values: FieldsConfig = { contact: [], misc: [] };
  values[group] = [{ name: fieldName, ...config }];
  let form!: UseFormReturn<FieldsConfig>;
  function Harness() {
    form = useForm<FieldsConfig>({ mode: "onBlur", resolver: zodResolver(fieldsConfigSchema), defaultValues: values });
    return <ConfigPanel form={form} path={`${group}.0`} fieldName={fieldName} />;
  }
  render(<Harness />);
  return () => form.getValues(`${group}.0`);
};

// The Width/Rows number inputs sit next to a plain <span> caption rather than a <label>.
const captionedInput = (caption: string) => screen.getByText(caption).nextElementSibling as HTMLInputElement;

describe("ConfigPanel", () => {
  it("shows the field's name and type", () => {
    renderPanel("email");
    expect(screen.getByRole("heading", { name: "email" })).toBeInTheDocument();
    // "email input", not a bare "email", which would read like a field name.
    expect(screen.getByText("email input", { selector: "span" })).toBeInTheDocument();
  });

  describe("contact text fields", () => {
    it("offer label, placeholder, default, and width -- but no heading, rows, or options", () => {
      renderPanel("first", { label: "First name", width: 6 });
      expect(screen.getByLabelText("Label")).toHaveValue("First name");
      expect(screen.getByLabelText("Label").tagName).toBe("INPUT");
      expect(screen.getByLabelText("Placeholder")).toBeInTheDocument();
      expect(screen.getByLabelText("Default")).toBeInTheDocument();
      expect(captionedInput("Width")).toHaveValue(6);
      expect(screen.queryByLabelText("Heading")).not.toBeInTheDocument();
      expect(screen.queryByText("Rows")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Add option/ })).not.toBeInTheDocument();
    });

    it("write each edit into the field's entry", async () => {
      const user = userEvent.setup();
      const entry = renderPanel("first");

      await user.type(screen.getByLabelText("Placeholder"), "J");
      await user.type(captionedInput("Width"), "4");
      await user.click(document.getElementById("config-required-first")!);

      expect(entry()).toEqual({ name: "first", placeholder: "J", width: 4, required: true });
    });

    // Cleared to null: react-hook-form would show an undefined value as the width the form loaded with.
    it("clear width to unset, leaving the input empty to type into", async () => {
      const user = userEvent.setup();
      const entry = renderPanel("first", { width: 6 });

      await user.clear(captionedInput("Width"));
      expect(entry().width).toBeNull();
      expect(captionedInput("Width")).toHaveValue(null);

      await user.type(captionedInput("Width"), "4");
      expect(entry().width).toBe(4);
    });

    // jsdom doesn't model a number input holding unparseable text, so this reports it the way a
    // browser does: an empty value, with validity.badInput set.
    it("show an error for a width that isn't a number, rather than unsetting it", async () => {
      const entry = renderPanel("first", { width: 6 });
      const input = captionedInput("Width");
      Object.defineProperty(input, "validity", { value: { badInput: true } });

      fireEvent.change(input, { target: { value: "" } });
      expect(entry().width).toBeNaN();
      fireEvent.blur(input);
      expect(await screen.findByText("Must be a whole number from 1 to 12")).toBeInTheDocument();
    });

    // Typed into an empty input, the text doesn't change the value (still ""), so there's no
    // change event; it's caught when the input loses focus.
    it("show an error for text that isn't a number typed into an empty width", async () => {
      const entry = renderPanel("first");
      const input = captionedInput("Width");
      Object.defineProperty(input, "validity", { value: { badInput: true } });

      fireEvent.blur(input);
      expect(entry().width).toBeNaN();
      expect(await screen.findByText("Must be a whole number from 1 to 12")).toBeInTheDocument();
    });

    it("clear the default to blank", async () => {
      const user = userEvent.setup();
      const entry = renderPanel("first", { defaultValue: "x" });

      await user.clear(screen.getByLabelText("Default"));
      expect(entry().defaultValue).toBe("");
      expect(screen.getByLabelText("Default")).toHaveValue("");
    });

    it.each(["13", "0", "6.5"])(
      "show an error for a width of %s once it loses focus",
      async (width) => {
        const message = "Must be a whole number from 1 to 12";
        const user = userEvent.setup();
        renderPanel("first");

        await user.type(captionedInput("Width"), width);
        expect(screen.queryByText(message)).not.toBeInTheDocument();
        await user.tab();
        expect(await screen.findByText(message)).toBeInTheDocument();
        expect(captionedInput("Width")).toHaveAttribute("aria-invalid", "true");
      },
    );
  });

  describe("the nametag toggle", () => {
    it.each(["last", "pronouns"] as const)("appears for %s", async (name) => {
      const user = userEvent.setup();
      const entry = renderPanel(name);
      await user.click(screen.getByRole("switch", { name: "Include on nametag?" }));
      expect(entry().includeOnNametag).toBe(true);
    });

    it.each(["first", "email", "nametag"] as const)("doesn't appear for %s", (name) => {
      renderPanel(name);
      expect(screen.queryByRole("switch", { name: "Include on nametag?" })).not.toBeInTheDocument();
    });
  });

  describe("misc fields", () => {
    it("get a heading and a multi-line label, but no width", () => {
      renderPanel("comments", { title: "Anything else?", label: "Tell us", rows: 5 });
      expect(screen.getByLabelText("Heading")).toHaveValue("Anything else?");
      expect(screen.getByLabelText("Label").tagName).toBe("TEXTAREA");
      expect(screen.queryByText("Width")).not.toBeInTheDocument();
    });

    it("textareas get a rows control that stores numbers", async () => {
      const user = userEvent.setup();
      const entry = renderPanel("comments");
      await user.type(captionedInput("Rows"), "3");
      expect(entry().rows).toBe(3);
    });

    it("clearing rows unsets it rather than storing 0", async () => {
      const user = userEvent.setup();
      const entry = renderPanel("comments", { rows: 5 });
      expect(captionedInput("Rows")).toHaveValue(5);
      await user.clear(captionedInput("Rows"));
      expect(entry().rows).toBeNull();
      expect(captionedInput("Rows")).toHaveValue(null);
    });

    it("shows an error for 0 rows once it loses focus", async () => {
      const user = userEvent.setup();
      renderPanel("comments");
      await user.type(captionedInput("Rows"), "0");
      await user.tab();
      expect(await screen.findByText("Must be a whole number, 1 or more")).toBeInTheDocument();
    });

    it.each(["age", "share", "first"] as const)("non-textarea %s gets no rows control", (name) => {
      renderPanel(name);
      expect(screen.queryByText("Rows")).not.toBeInTheDocument();
    });
  });

  describe("option lists", () => {
    it("radio fields edit their options instead of a placeholder", () => {
      renderPanel("age", { options: [{ label: "Adult", value: "adult" }] });
      expect(screen.getByText("Radio options")).toBeInTheDocument();
      expect(screen.queryByLabelText("Placeholder")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Adult")).toBeInTheDocument();
      expect(screen.getByDisplayValue("adult")).toBeInTheDocument();
    });

    it("checkbox fields edit checkbox options", () => {
      renderPanel("carpool");
      expect(screen.getByText("Checkbox options")).toBeInTheDocument();
    });

    it("add, edit, and remove options", async () => {
      const user = userEvent.setup();
      const options = [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }];
      const entry = renderPanel("agreement", { options });

      await user.click(screen.getByRole("button", { name: /Add option/ }));
      expect(entry().options).toEqual([...options, { label: "", value: "" }]);

      await user.type(screen.getByDisplayValue("No"), "!");
      expect(entry().options).toEqual([options[0], { label: "No!", value: "no" }, { label: "", value: "" }]);

      await user.type(screen.getByDisplayValue("yes"), "s");
      expect(entry().options).toEqual([{ label: "Yes", value: "yess" }, { label: "No!", value: "no" }, { label: "", value: "" }]);

      await user.click(screen.getAllByRole("button", { name: "Remove option" })[0]!);
      expect(entry().options).toEqual([{ label: "No!", value: "no" }, { label: "", value: "" }]);
    });
  });
  // A choice field's default is picked from its own options, the way a registrant would pick.
  describe("defaults of choice fields", () => {
    const defaultGroup = () => within(screen.getByRole("group", { name: "Default" }));
    const ride = { label: "I can offer a ride", value: "ride" };
    const host = { label: "I can host", value: "host" };

    it("text fields keep a text box", () => {
      renderPanel("first", { defaultValue: "Ada" });
      expect(screen.getByLabelText("Default")).toHaveValue("Ada");
    });

    describe("checkbox fields", () => {
      it("check and uncheck options", async () => {
        const user = userEvent.setup();
        const entry = renderPanel("carpool", { options: [ride, host], defaultValue: ["ride"] });

        expect(defaultGroup().getByRole("checkbox", { name: ride.label })).toBeChecked();
        expect(defaultGroup().getByRole("checkbox", { name: host.label })).not.toBeChecked();

        await user.click(defaultGroup().getByRole("checkbox", { name: host.label }));
        expect(entry().defaultValue).toEqual(["ride", "host"]);
        await user.click(defaultGroup().getByRole("checkbox", { name: ride.label }));
        expect(entry().defaultValue).toEqual(["host"]);
      });

      // The roster's other details depend on the name.
      it("keep the field's prerequisite option", async () => {
        const user = userEvent.setup();
        const entry = renderPanel("share", { options: MISC_FIELD_DEFS.share.defaults.options, defaultValue: [] });
        const box = (label: string) => defaultGroup().getByRole("checkbox", { name: label });

        await user.click(box("Include my email in the roster"));
        expect(entry().defaultValue).toEqual(["name", "email"]);
        expect(box("Include my name in the roster")).toBeChecked();

        await user.click(box("Include my name in the roster"));
        expect(entry().defaultValue).toEqual([]);
        expect(box("Include my email in the roster")).not.toBeChecked();
      });

      // An option's value edited (or the option removed) after it was chosen.
      it("list a default that's no longer an option, so it can be unchecked", async () => {
        const user = userEvent.setup();
        const entry = renderPanel("carpool", { options: [ride], defaultValue: ["ride", "house"] });

        const stale = defaultGroup().getByRole("checkbox", { name: "house (not an option)" });
        expect(stale).toBeChecked();
        await user.click(stale);
        expect(entry().defaultValue).toEqual(["ride"]);
      });

      it("offer only options that have a value", () => {
        renderPanel("carpool", { options: [ride, { label: "Half-written", value: "" }] });
        expect(defaultGroup().getAllByRole("checkbox")).toHaveLength(1);
      });
    });

    describe("radio fields", () => {
      const options = [{ label: "Adult", value: "adult" }, { label: "13-17 yr old", value: "13-17" }];

      it("choose one option, or none", async () => {
        const user = userEvent.setup();
        const entry = renderPanel("age", { options, defaultValue: "adult" });

        expect(defaultGroup().getByRole("radio", { name: "Adult" })).toBeChecked();
        await user.click(defaultGroup().getByRole("radio", { name: "13-17 yr old" }));
        expect(entry().defaultValue).toBe("13-17");
        await user.click(defaultGroup().getByRole("radio", { name: "None" }));
        expect(entry().defaultValue).toBe("");
      });

      it("start on None when there's no default", () => {
        renderPanel("age", { options });
        expect(defaultGroup().getByRole("radio", { name: "None" })).toBeChecked();
      });

      it("show a default that's no longer an option as chosen, until another is", async () => {
        const user = userEvent.setup();
        const entry = renderPanel("age", { options, defaultValue: "adlut" });

        expect(defaultGroup().getByRole("radio", { name: "adlut (not an option)" })).toBeChecked();
        await user.click(defaultGroup().getByRole("radio", { name: "Adult" }));
        expect(entry().defaultValue).toBe("adult");
        expect(defaultGroup().queryByRole("radio", { name: "adlut (not an option)" })).not.toBeInTheDocument();
      });
    });
  });
  // Which age brackets the person registering may choose (the rest are for those they register).
  describe("options the person registering may choose", () => {
    const options = [{ label: "Adult", value: "adult" }, { label: "Teen", value: "teen" }, { label: "Child", value: "child" }];
    const group = () => within(screen.getByRole("group", { name: "Can register a group" }));

    it("are offered for the age field only", () => {
      renderPanel("dietaryPreferences", { options });
      expect(screen.queryByRole("group", { name: "Can register a group" })).not.toBeInTheDocument();
    });

    it("check and uncheck the field's options", async () => {
      const user = userEvent.setup();
      const entry = renderPanel("age", { options, firstPersonOptions: ["adult"] });

      expect(group().getByRole("checkbox", { name: "Adult" })).toBeChecked();
      await user.click(group().getByRole("checkbox", { name: "Teen" }));
      expect(entry().firstPersonOptions).toEqual(["adult", "teen"]);
      await user.click(group().getByRole("checkbox", { name: "Adult" }));
      expect(entry().firstPersonOptions).toEqual(["teen"]);
    });

    it("list one that's no longer an option, so it can be unchecked", async () => {
      const user = userEvent.setup();
      const entry = renderPanel("age", { options, firstPersonOptions: ["adult", "13-17"] });

      await user.click(group().getByRole("checkbox", { name: "13-17 (not an option)" }));
      expect(entry().firstPersonOptions).toEqual(["adult"]);
    });
  });
});
