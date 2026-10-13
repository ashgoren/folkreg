import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AutocompleteField } from "./autocomplete-field";
import { TestForm } from "./test-helpers";
import { fieldConfig } from "./types";

const testField = fieldConfig({ name: "state", label: "State" });

describe("AutocompleteField", () => {
  it("lets the visitor pick a state from the catalog's suggestions", async () => {
    const user = userEvent.setup();
    render(
      <TestForm defaultValues={{ person: { state: "" } }}>
        {(control) => <AutocompleteField control={control} name="person.state" fieldConfig={testField} isRegistrant />}
      </TestForm>
    );

    await user.click(screen.getByRole("combobox", { name: "State" }));
    await user.click(await screen.findByRole("option", { name: "Oregon" }));

    expect(screen.getByRole("combobox", { name: "State" })).toHaveTextContent("Oregon");
  });
});
