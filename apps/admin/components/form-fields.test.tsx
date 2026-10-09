// Tests for TextField and NumberField together -- both are thin Controller wrappers, so a tiny
// react-hook-form harness with a real zod resolver exercises them the same way a config page does.

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { TextField } from "./form-text-field";
import { NumberField } from "./form-number-field";

const schema = z.object({
  email: z.union([z.literal(""), z.email("Must be a valid email")]),
  count: z.number({ error: "Required" }).min(1, "At least 1"),
});
type Values = z.infer<typeof schema>;

// Exposes the latest form values through a callback so tests can assert on what the field
// actually wrote into form state (e.g. NaN vs. 0), not just what the input displays.
function Harness({ defaults, onValues }: { defaults: Values; onValues?: (v: Values) => void }) {
  const form = useForm<Values>({ mode: "onBlur", resolver: zodResolver(schema), defaultValues: defaults });
  onValues?.(form.watch());
  return (
    <form>
      <TextField control={form.control} name="email" id="email" label="Email" type="email" autoComplete="email" description="Where receipts go" required />
      <NumberField control={form.control} name="count" id="count" label="Count" description="How many" />
    </form>
  );
}

describe("TextField", () => {
  it("renders its label, description, and input attributes", () => {
    render(<Harness defaults={{ email: "a@example.com", count: 1 }} />);
    const input = screen.getByLabelText(/Email/);
    expect(input).toHaveValue("a@example.com");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("autocomplete", "email");
    expect(input).toHaveAttribute("id", "email");
    expect(screen.getByText("Where receipts go")).toBeInTheDocument();
  });

  it("shows an inline error on blur for an invalid value, and clears it on the next blur once fixed", async () => {
    const user = userEvent.setup();
    render(<Harness defaults={{ email: "", count: 1 }} />);
    const input = screen.getByLabelText(/Email/);

    await user.type(input, "not-an-email");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(); // mode: "onBlur" -- nothing while typing
    await user.tab();
    expect(screen.getByRole("alert")).toHaveTextContent("Must be a valid email");
    expect(input).toHaveAttribute("aria-invalid", "true");

    await user.clear(input);
    await user.type(input, "ok@example.com");
    // RHF's reValidateMode (revalidate on change) only kicks in after a submit, and these
    // autosaving forms never submit -- so a fixed value stays flagged until it's blurred again.
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.tab();
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});

describe("NumberField", () => {
  it("writes numbers (not strings) into form state", async () => {
    let latest: Values | undefined;
    const user = userEvent.setup();
    render(<Harness defaults={{ email: "", count: 1 }} onValues={(v) => (latest = v)} />);

    const input = screen.getByLabelText("Count");
    await user.clear(input);
    await user.type(input, "42");
    expect(latest?.count).toBe(42);
  });

  it("maps a cleared input to NaN and displays it as empty, so a required number errors instead of snapping back to 0", async () => {
    let latest: Values | undefined;
    const user = userEvent.setup();
    render(<Harness defaults={{ email: "", count: 5 }} onValues={(v) => (latest = v)} />);

    const input = screen.getByLabelText("Count");
    await user.clear(input);
    expect(latest?.count).toBeNaN();
    expect(input).toHaveValue(null); // an empty number input

    await user.tab();
    expect(screen.getByRole("alert")).toHaveTextContent("Required");
  });

  it("renders a NaN default as an empty input", () => {
    render(<Harness defaults={{ email: "", count: NaN }} />);
    expect(screen.getByLabelText("Count")).toHaveValue(null);
    expect(screen.getByText("How many")).toBeInTheDocument();
  });

  it("shows a min-value error on blur", async () => {
    const user = userEvent.setup();
    render(<Harness defaults={{ email: "", count: 5 }} />);
    const input = screen.getByLabelText("Count");
    await user.clear(input);
    await user.type(input, "0");
    await user.tab();
    expect(screen.getByRole("alert")).toHaveTextContent("At least 1");
  });
});
