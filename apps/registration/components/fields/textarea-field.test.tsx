import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { FieldEntry } from "@repo/tenant-config";
import { TextareaField } from "./textarea-field";
import { TestForm } from "./test-helpers";

const entry: FieldEntry = { name: "comments", label: "Comments", rows: 5 };

describe("TextareaField", () => {
  it("renders a textarea with the tenant's rows", () => {
    render(
      <TestForm defaultValues={{ person: { comments: "" } }}>
        {(control) => <TextareaField control={control} name="person.comments" entry={entry} isRegistrant />}
      </TestForm>
    );

    expect(screen.getByRole("textbox", { name: "Comments" })).toHaveAttribute("rows", "5");
  });
});
