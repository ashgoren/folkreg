import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RadioField } from "./radio-field";
import { TestForm } from "./test-helpers";
import { fieldConfig } from "./types";

const ageField = fieldConfig({
  name: "age",
  label: "Age",
  options: [
    { label: "Adult", value: "adult" },
    { label: "13-17 yr old", value: "13-17" },
    { label: "6-12 yr old", value: "6-12" },
  ],
  firstPersonOptions: ["adult", "13-17"],
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
});
