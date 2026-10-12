import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { FieldEntry } from "@repo/tenant-config";
import { DynamicField } from "./dynamic-field";
import { TestForm } from "./test-helpers";

describe("DynamicField", () => {
  it.each<[string, FieldEntry, string]>([
    ["text", { name: "first", label: "First name" }, "textbox"],
    ["email", { name: "email", label: "Email" }, "textbox"],
    ["radio", { name: "age", label: "Age", options: [{ label: "Adult", value: "adult" }] }, "radio"],
    ["checkbox", { name: "share", label: "Roster", options: [{ label: "Name", value: "name" }] }, "checkbox"],
    ["textarea", { name: "comments", label: "Comments" }, "textbox"],
    ["autocomplete", { name: "state", label: "State" }, "combobox"],
  ])("dispatches a %s field to the right component", (_type, entry, role) => {
    render(
      <TestForm defaultValues={{ person: { [entry.name]: entry.name === "share" ? [] : "" } }}>
        {(control) => <DynamicField control={control} name={`person.${entry.name}`} entry={entry} isRegistrant />}
      </TestForm>
    );

    expect(screen.getAllByRole(role).length).toBeGreaterThan(0);
  });
});
