import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TextareaField } from "./textarea-field";
import { TestForm } from "./test-helpers";
import { fieldConfig } from "./types";

const testField = fieldConfig({ name: "comments", label: "Comments", width: 12, rows: 5 });

describe("TextareaField", () => {
  it("renders a textarea with the tenant's rows", () => {
    render(
      <TestForm defaultValues={{ person: { comments: "" } }}>
        {(control) => <TextareaField control={control} name="person.comments" fieldConfig={testField} isRegistrant />}
      </TestForm>
    );

    expect(screen.getByRole("textbox", { name: "Comments" })).toHaveAttribute("rows", "5");
  });
});
