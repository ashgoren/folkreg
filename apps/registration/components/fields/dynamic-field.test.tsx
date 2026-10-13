import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ActiveField } from "@repo/tenant-config";
import { DynamicField } from "./dynamic-field";
import { TestForm } from "./test-helpers";
import { fieldConfig, type FieldConfig } from "./types";

const field = (activeField: ActiveField): FieldConfig => fieldConfig(activeField);

describe("DynamicField", () => {
  it.each<[string, FieldConfig, string]>([
    ["text", field({ name: "first", label: "First name" }), "textbox"],
    ["email", field({ name: "email", label: "Email" }), "textbox"],
    ["radio", field({ name: "age", label: "Age", options: [{ label: "Adult", value: "adult" }] }), "radio"],
    ["checkbox", field({ name: "share", label: "Roster", options: [{ label: "Name", value: "name" }] }), "checkbox"],
    ["textarea", field({ name: "comments", label: "Comments" }), "textbox"],
    ["autocomplete", field({ name: "state", label: "State" }), "combobox"],
  ])("dispatches a %s field to the right component", (_type, testField, role) => {
    render(
      <TestForm defaultValues={{ person: { [testField.name]: testField.name === "share" ? [] : "" } }}>
        {(control) => <DynamicField control={control} name={`person.${testField.name}`} fieldConfig={testField} isRegistrant />}
      </TestForm>
    );

    expect(screen.getAllByRole(role).length).toBeGreaterThan(0);
  });
});
