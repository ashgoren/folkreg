import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FieldEntry } from "@repo/tenant-config";
import { RadioField } from "./radio-field";
import { TestForm } from "./test-helpers";

const ageEntry: FieldEntry = {
  name: "age",
  label: "Age",
  options: [
    { label: "Adult", value: "adult" },
    { label: "13-17 yr old", value: "13-17" },
    { label: "6-12 yr old", value: "6-12" },
  ],
  firstPersonOptions: ["adult", "13-17"],
};

const photoEntry: FieldEntry = {
  name: "photo",
  label: "Photo consent",
  options: [
    { label: "Yes", value: "Yes" },
    { label: "Other", value: "Other" },
  ],
};

describe("RadioField", () => {
  it("renders every option", () => {
    render(
      <TestForm defaultValues={{ person: { age: "" } }}>
        {(control) => <RadioField control={control} name="person.age" entry={ageEntry} isRegistrant />}
      </TestForm>
    );

    expect(screen.getByRole("radio", { name: "Adult" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "6-12 yr old" })).toBeInTheDocument();
  });

  it("disables options outside firstPersonOptions for the registrant", () => {
    render(
      <TestForm defaultValues={{ person: { age: "" } }}>
        {(control) => <RadioField control={control} name="person.age" entry={ageEntry} isRegistrant />}
      </TestForm>
    );

    expect(screen.getByRole("radio", { name: "Adult" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "6-12 yr old" })).toBeDisabled();
  });

  it("leaves every option enabled for a companion", () => {
    render(
      <TestForm defaultValues={{ person: { age: "" } }}>
        {(control) => <RadioField control={control} name="person.age" entry={ageEntry} isRegistrant={false} />}
      </TestForm>
    );

    expect(screen.getByRole("radio", { name: "6-12 yr old" })).toBeEnabled();
  });

  it("reveals the follow-up field only once its trigger option is selected", async () => {
    const user = userEvent.setup();
    render(
      <TestForm defaultValues={{ person: { photo: "", photoComments: "" } }}>
        {(control) => <RadioField control={control} name="person.photo" entry={photoEntry} isRegistrant />}
      </TestForm>
    );

    expect(screen.queryByLabelText(/please explain/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Other" }));

    expect(screen.getByLabelText(/please explain/i)).toBeInTheDocument();
  });
});
