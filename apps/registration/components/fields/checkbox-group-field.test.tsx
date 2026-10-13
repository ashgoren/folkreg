import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckboxGroupField } from "./checkbox-group-field";
import { TestForm } from "./test-helpers";
import { fieldConfig } from "./types";

const shareField = fieldConfig({
  name: "share",
  label: "Roster",
  options: [
    { label: "Name", value: "name" },
    { label: "Email", value: "email" },
  ],
});

describe("CheckboxGroupField", () => {
  it("renders every option", () => {
    render(
      <TestForm defaultValues={{ person: { share: [] } }}>
        {(control) => <CheckboxGroupField control={control} name="person.share" fieldConfig={shareField} isRegistrant />}
      </TestForm>
    );

    expect(screen.getByRole("checkbox", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Email" })).toBeInTheDocument();
  });

  it("checks the prerequisite option automatically when another option is checked", async () => {
    const user = userEvent.setup();
    render(
      <TestForm defaultValues={{ person: { share: [] } }}>
        {(control) => <CheckboxGroupField control={control} name="person.share" fieldConfig={shareField} isRegistrant />}
      </TestForm>
    );

    await user.click(screen.getByRole("checkbox", { name: "Email" }));

    expect(screen.getByRole("checkbox", { name: "Email" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Name" })).toBeChecked();
  });

  it("clears every option when the prerequisite is unchecked", async () => {
    const user = userEvent.setup();
    render(
      <TestForm defaultValues={{ person: { share: ["name", "email"] } }}>
        {(control) => <CheckboxGroupField control={control} name="person.share" fieldConfig={shareField} isRegistrant />}
      </TestForm>
    );

    await user.click(screen.getByRole("checkbox", { name: "Name" }));

    expect(screen.getByRole("checkbox", { name: "Name" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Email" })).not.toBeChecked();
  });
});
