import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FieldEntry } from "@repo/tenant-config";
import { CheckboxGroupField } from "./checkbox-group-field";
import { TestForm } from "./test-helpers";

const shareEntry: FieldEntry = {
  name: "share",
  label: "Roster",
  options: [
    { label: "Name", value: "name" },
    { label: "Email", value: "email" },
  ],
};

const miscEntry: FieldEntry = {
  name: "misc",
  label: "Anything else?",
  options: [
    { label: "I am under 18 years old", value: "minor" },
    { label: "I am new to contra", value: "beginner" },
  ],
};

describe("CheckboxGroupField", () => {
  it("renders every option", () => {
    render(
      <TestForm defaultValues={{ person: { share: [] } }}>
        {(control) => <CheckboxGroupField control={control} name="person.share" entry={shareEntry} isRegistrant />}
      </TestForm>
    );

    expect(screen.getByRole("checkbox", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Email" })).toBeInTheDocument();
  });

  it("checks the prerequisite option automatically when another option is checked", async () => {
    const user = userEvent.setup();
    render(
      <TestForm defaultValues={{ person: { share: [] } }}>
        {(control) => <CheckboxGroupField control={control} name="person.share" entry={shareEntry} isRegistrant />}
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
        {(control) => <CheckboxGroupField control={control} name="person.share" entry={shareEntry} isRegistrant />}
      </TestForm>
    );

    await user.click(screen.getByRole("checkbox", { name: "Name" }));

    expect(screen.getByRole("checkbox", { name: "Name" })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Email" })).not.toBeChecked();
  });

  it("reveals the follow-up field only once its trigger option is checked", async () => {
    const user = userEvent.setup();
    render(
      <TestForm defaultValues={{ person: { misc: [], miscComments: "" } }}>
        {(control) => <CheckboxGroupField control={control} name="person.misc" entry={miscEntry} isRegistrant />}
      </TestForm>
    );

    expect(screen.queryByLabelText(/what is your age/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "I am under 18 years old" }));

    expect(screen.getByLabelText(/what is your age/i)).toBeInTheDocument();
  });
});
