import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RadioField } from "./radio-field";
import { TestForm } from "./test-helpers";
import { fieldConfig } from "./types";

const ageField = fieldConfig({
  name: "age",
  label: "Age",
  width: 12,
  options: [
    { label: "Adult", value: "adult" },
    { label: "13-17 yr old", value: "13-17" },
    { label: "6-12 yr old", value: "6-12" },
  ],
  firstPersonOptions: ["adult", "13-17"],
});

const photoField = fieldConfig({
  name: "photo",
  label: "Photo consent",
  width: 12,
  options: [
    { label: "Yes", value: "Yes" },
    { label: "Other", value: "Other" },
  ],
});

describe("RadioField", () => {
  it("renders every option", () => {
    render(
      <TestForm defaultValues={{ person: { age: "" } }}>
        {(control) => <RadioField control={control} name="person.age" fieldConfig={ageField} isRegistrant />}
      </TestForm>
    );

    expect(screen.getByRole("radio", { name: "Adult" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "6-12 yr old" })).toBeInTheDocument();
  });

  it("disables options outside firstPersonOptions for the registrant", () => {
    render(
      <TestForm defaultValues={{ person: { age: "" } }}>
        {(control) => <RadioField control={control} name="person.age" fieldConfig={ageField} isRegistrant />}
      </TestForm>
    );

    expect(screen.getByRole("radio", { name: "Adult" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "6-12 yr old" })).toBeDisabled();
  });

  it("leaves every option enabled for a companion", () => {
    render(
      <TestForm defaultValues={{ person: { age: "" } }}>
        {(control) => <RadioField control={control} name="person.age" fieldConfig={ageField} isRegistrant={false} />}
      </TestForm>
    );

    expect(screen.getByRole("radio", { name: "6-12 yr old" })).toBeEnabled();
  });

  it("reveals the follow-up field only once its trigger option is selected", async () => {
    const user = userEvent.setup();
    render(
      <TestForm defaultValues={{ person: { photo: "", photoComments: "" } }}>
        {(control) => <RadioField control={control} name="person.photo" fieldConfig={photoField} isRegistrant />}
      </TestForm>
    );

    expect(screen.queryByLabelText(/please explain/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Other" }));

    expect(screen.getByLabelText(/please explain/i)).toBeInTheDocument();
  });

  it("keeps the follow-up in the question's own grid item, at the question's width", async () => {
    const user = userEvent.setup();
    render(
      <TestForm defaultValues={{ person: { photo: "", photoComments: "" } }}>
        {(control) => <RadioField control={control} name="person.photo" fieldConfig={{ ...photoField, width: 6 }} isRegistrant />}
      </TestForm>
    );

    await user.click(screen.getByRole("radio", { name: "Other" }));

    // The nearest ancestor setting a grid column (Radix gives the radio group its own inline style).
    const gridItem = screen.getByRole("radiogroup").closest<HTMLElement>("[style*='grid-column']");
    expect(gridItem).toHaveStyle({ gridColumn: "span 6" });
    expect(gridItem).toContainElement(screen.getByLabelText(/please explain/i));
  });
});
