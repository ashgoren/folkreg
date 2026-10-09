// ConfigPanel is a controlled component -- it renders `config` and reports edits through
// `onChange(partialUpdate)`, holding no state of its own -- so these tests render it directly and
// assert on the partial updates it emits. Which controls appear depends on the field's type and
// group, as defined in @repo/fields.

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FieldConfig } from "@repo/types";
import { ConfigPanel } from "./ConfigPanel";

const renderPanel = (fieldName: string, group: "contact" | "misc", config: FieldConfig = {}) => {
  const onChange = vi.fn();
  render(<ConfigPanel fieldName={fieldName} group={group} config={config} onChange={onChange} />);
  return onChange;
};

// The Width/Rows number inputs sit next to a plain <span> caption rather than a <label>.
const captionedInput = (caption: string) => screen.getByText(caption).nextElementSibling as HTMLInputElement;

describe("ConfigPanel", () => {
  it("renders nothing for a field name with no definition", () => {
    const { container } = render(<ConfigPanel fieldName="notAField" group="contact" config={{}} onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the field's name and type", () => {
    renderPanel("email", "contact");
    expect(screen.getByRole("heading", { name: "email" })).toBeInTheDocument();
    expect(screen.getByText("email", { selector: "span" })).toBeInTheDocument();
  });

  describe("contact text fields", () => {
    it("offer label, placeholder, default, and width -- but no heading, rows, or options", () => {
      renderPanel("first", "contact", { label: "First name", width: 6 });
      expect(screen.getByLabelText("Label")).toHaveValue("First name");
      expect(screen.getByLabelText("Label").tagName).toBe("INPUT");
      expect(screen.getByLabelText("Placeholder")).toBeInTheDocument();
      expect(screen.getByLabelText("Default")).toBeInTheDocument();
      expect(captionedInput("Width")).toHaveValue(6);
      expect(screen.queryByLabelText("Heading")).not.toBeInTheDocument();
      expect(screen.queryByText("Rows")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Add option/ })).not.toBeInTheDocument();
    });

    it("report each edit as a partial update", async () => {
      const user = userEvent.setup();
      const onChange = renderPanel("first", "contact");

      await user.type(screen.getByLabelText("Placeholder"), "J");
      expect(onChange).toHaveBeenLastCalledWith({ placeholder: "J" });

      await user.type(captionedInput("Width"), "4");
      expect(onChange).toHaveBeenLastCalledWith({ width: 4 });

      await user.click(document.getElementById("config-required-first")!);
      expect(onChange).toHaveBeenLastCalledWith({ required: true });
    });

    it("clear width and default back to undefined rather than storing empties", async () => {
      const user = userEvent.setup();
      const onChange = renderPanel("first", "contact", { width: 6, defaultValue: "x" });

      await user.clear(captionedInput("Width"));
      expect(onChange).toHaveBeenLastCalledWith({ width: undefined });

      await user.clear(screen.getByLabelText("Default"));
      expect(onChange).toHaveBeenLastCalledWith({ defaultValue: undefined });
    });
  });

  describe("the nametag toggle", () => {
    it.each(["last", "pronouns"])("appears for %s", async (name) => {
      const user = userEvent.setup();
      const onChange = renderPanel(name, "contact");
      await user.click(screen.getByRole("switch", { name: "Include on nametag?" }));
      expect(onChange).toHaveBeenLastCalledWith({ includeOnNametag: true });
    });

    it.each(["first", "email", "nametag"])("doesn't appear for %s", (name) => {
      renderPanel(name, "contact");
      expect(screen.queryByRole("switch", { name: "Include on nametag?" })).not.toBeInTheDocument();
    });
  });

  describe("misc fields", () => {
    it("get a heading and a multi-line label, but no width", () => {
      renderPanel("comments", "misc", { title: "Anything else?", label: "Tell us", rows: 5 });
      expect(screen.getByLabelText("Heading")).toHaveValue("Anything else?");
      expect(screen.getByLabelText("Label").tagName).toBe("TEXTAREA");
      expect(screen.queryByText("Width")).not.toBeInTheDocument();
    });

    it("textareas get a rows control that reports numbers", async () => {
      const user = userEvent.setup();
      const onChange = renderPanel("comments", "misc");
      await user.type(captionedInput("Rows"), "3");
      expect(onChange).toHaveBeenLastCalledWith({ rows: 3 });
    });

    it("clearing rows reports undefined rather than 0", async () => {
      const user = userEvent.setup();
      const onChange = renderPanel("comments", "misc", { rows: 5 });
      expect(captionedInput("Rows")).toHaveValue(5);
      await user.clear(captionedInput("Rows"));
      expect(onChange).toHaveBeenLastCalledWith({ rows: undefined });
    });

    it.each(["age", "share", "first"])("non-textarea %s gets no rows control", (name) => {
      renderPanel(name, name === "first" ? "contact" : "misc");
      expect(screen.queryByText("Rows")).not.toBeInTheDocument();
    });
  });

  describe("option lists", () => {
    it("radio fields edit their options instead of a placeholder", () => {
      renderPanel("age", "misc", { options: [{ label: "Adult", value: "adult" }] });
      expect(screen.getByText("Radio options")).toBeInTheDocument();
      expect(screen.queryByLabelText("Placeholder")).not.toBeInTheDocument();
      expect(screen.getByDisplayValue("Adult")).toBeInTheDocument();
      expect(screen.getByDisplayValue("adult")).toBeInTheDocument();
    });

    it("checkbox fields explain their comma-separated default", () => {
      renderPanel("share", "misc");
      expect(screen.getByText("Checkbox options")).toBeInTheDocument();
      expect(screen.getByText("Comma-separated option values")).toBeInTheDocument();
    });

    it("add, edit, and remove options as whole-list updates", async () => {
      const user = userEvent.setup();
      const options = [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }];
      const onChange = renderPanel("agreement", "misc", { options });

      await user.click(screen.getByRole("button", { name: /Add option/ }));
      expect(onChange).toHaveBeenLastCalledWith({ options: [...options, { label: "", value: "" }] });

      await user.type(screen.getByDisplayValue("No"), "!");
      expect(onChange).toHaveBeenLastCalledWith({ options: [options[0], { label: "No!", value: "no" }] });

      await user.type(screen.getByDisplayValue("yes"), "s");
      expect(onChange).toHaveBeenLastCalledWith({ options: [{ label: "Yes", value: "yess" }, options[1]] });

      await user.click(screen.getAllByRole("button", { name: "Remove option" })[0]!);
      expect(onChange).toHaveBeenLastCalledWith({ options: [options[1]] });
    });
  });
});
