import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FollowUpField } from "./follow-up-field";
import { TestForm } from "./test-helpers";

describe("FollowUpField", () => {
  it("renders a single-line input when the follow-up has no rows", () => {
    render(
      <TestForm defaultValues={{ person: { comments: "" } }}>
        {(control) => (
          <FollowUpField
            control={control}
            name="person.comments"
            followUp={{ triggerValue: "other", storageKey: "comments", label: "Please specify", requiredMessage: "Required" }}
          />
        )}
      </TestForm>
    );

    expect(screen.getByRole("textbox", { name: "Please specify" })).not.toHaveAttribute("rows");
  });

  it("renders a textarea when the follow-up has rows", () => {
    render(
      <TestForm defaultValues={{ person: { comments: "" } }}>
        {(control) => (
          <FollowUpField
            control={control}
            name="person.comments"
            followUp={{ triggerValue: "other", storageKey: "comments", label: "Please specify", rows: 3, requiredMessage: "Required" }}
          />
        )}
      </TestForm>
    );

    expect(screen.getByRole("textbox", { name: "Please specify" })).toHaveAttribute("rows", "3");
  });
});
