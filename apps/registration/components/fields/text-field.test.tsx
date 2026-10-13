import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { personSchema } from "@repo/fields";
import type { ActiveField } from "@repo/tenant-config";
import { TextField } from "./text-field";
import { TestForm } from "./test-helpers";
import { fieldConfig } from "./types";

const testField = (overrides: Partial<ActiveField> = {}) =>
  fieldConfig({ name: "first", label: "First name", required: true, width: 12, ...overrides });

describe("TextField", () => {
  it("renders the label and placeholder from the tenant's settings", () => {
    render(
      <TestForm defaultValues={{ person: { first: "" } }}>
        {(control) => <TextField control={control} name="person.first" fieldConfig={testField({ placeholder: "Jane" })} isRegistrant />}
      </TestForm>
    );

    expect(screen.getByLabelText("First name", { exact: false })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Jane")).toBeInTheDocument();
  });

  it("uses the catalog's HTML type and autoComplete, not the tenant's", () => {
    render(
      <TestForm defaultValues={{ person: { email: "" } }}>
        {(control) => <TextField control={control} name="person.email" fieldConfig={testField({ name: "email", label: "Email" })} isRegistrant />}
      </TestForm>
    );

    const input = screen.getByLabelText("Email", { exact: false });
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
  });

  it("shows a required error once the field is blurred empty", async () => {
    const schema = z.object({ person: personSchema([{ name: "first", required: true }], 0) });
    const user = userEvent.setup();
    render(
      <TestForm defaultValues={{ person: { first: "" } }} resolver={zodResolver(schema)}>
        {(control) => <TextField control={control} name="person.first" fieldConfig={testField()} isRegistrant />}
      </TestForm>
    );

    await user.click(screen.getByLabelText("First name", { exact: false }));
    await user.tab();

    expect(await screen.findByText("Please enter first name.")).toBeInTheDocument();
  });
});
