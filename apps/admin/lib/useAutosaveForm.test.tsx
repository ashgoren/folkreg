import { describe, it, expect, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import { useFormState } from "react-hook-form";
import userEvent from "@testing-library/user-event";
import { z } from "zod";
import { expectNoSave } from "@/test/autosave";
import { useAutosaveForm } from "./useAutosaveForm";

// The name's parsed output differs from its input (the transform trims), so the tests can tell
// which of the two was saved.
const schema = z.object({
  name: z.string().min(1, "Required").transform((name) => name.trim()),
  agree: z.boolean(),
});
const defaultValues = { name: "start", agree: false };

// A minimal page: one text field, one checkbox, and formProps on the <form>, the way every config
// page wires the hook. When a save happens depends on focus and blur, which only a rendered form
// has.
function TestForm({ save }: { save: (data: z.output<typeof schema>) => Promise<string | null> }) {
  const { form, formProps } = useAutosaveForm({ schema, defaultValues, save });
  return (
    <form {...formProps}>
      <label>Name <input {...form.register("name")} /></label>
      <label><input type="checkbox" {...form.register("agree")} /> Agree</label>
    </form>
  );
}

// A page with a rule spanning two fields, its error attached to only one of them -- like
// Admissions' "default must be between min and max". The error is read with useFormState, the
// hook form: the React Compiler compiles this component, and would memoize a plain
// form.formState read the same way it does form.watch(name).
const rangeSchema = z.object({ low: z.number(), high: z.number() })
  .refine((range) => range.high >= range.low, { message: "Must be at least low", path: ["high"] });

function RangeForm({ save }: { save: (data: z.output<typeof rangeSchema>) => Promise<string | null> }) {
  const { form, formProps } = useAutosaveForm({ schema: rangeSchema, defaultValues: { low: 1, high: 5 }, save });
  const { errors } = useFormState({ control: form.control, name: "high" });
  return (
    <form {...formProps}>
      <label>Low <input type="number" {...form.register("low", { valueAsNumber: true })} /></label>
      <label>High <input type="number" {...form.register("high", { valueAsNumber: true })} /></label>
      {errors.high && <p role="alert">{errors.high.message}</p>}
    </form>
  );
}

const renderForm = () => {
  const save = vi.fn().mockResolvedValue(null);
  render(<TestForm save={save} />);
  return { save, user: userEvent.setup(), name: screen.getByLabelText("Name") };
};

describe("useAutosaveForm", () => {
  it("seeds the form with the default values", () => {
    const { name } = renderForm();
    expect(name).toHaveValue("start");
    expect(screen.getByLabelText("Agree")).not.toBeChecked();
  });

  // Saving while typing would save whatever the last valid keystroke left, not the final value.
  it("saves typed text once, when the field loses focus, as the schema's parsed output", async () => {
    const { save, user, name } = renderForm();

    await user.clear(name);
    await user.type(name, "  edited  ");
    await expectNoSave(save);

    await user.tab();
    await vi.waitFor(() => expect(save).toHaveBeenCalledExactlyOnceWith({ name: "edited", agree: false }));
  });

  it("never saves typed text that's invalid when the field loses focus", async () => {
    const { save, user, name } = renderForm();

    await user.clear(name);
    await user.tab();
    await expectNoSave(save);
  });

  // A click is already a complete gesture: there's no edit in progress to wait for.
  it("saves a non-text change, like a checkbox, immediately", async () => {
    const { save, user } = renderForm();

    await user.click(screen.getByLabelText("Agree"));
    await vi.waitFor(() => expect(save).toHaveBeenCalledExactlyOnceWith({ name: "start", agree: true }));
  });

  it("includes an earlier text edit in the next save, once the field has lost focus", async () => {
    const { save, user, name } = renderForm();

    await user.clear(name);
    await user.type(name, "typed");
    await user.click(screen.getByLabelText("Agree")); // moves focus off the text field first

    await vi.waitFor(() => expect(save).toHaveBeenLastCalledWith({ name: "typed", agree: true }));
  });

  // onBlur mode only shows the blurred field's own error. A blur that can't save shows every
  // error, so whatever is blocking the save is on screen even when it belongs to another field.
  it("shows every error when a blur finds the form invalid, including another field's", async () => {
    const save = vi.fn().mockResolvedValue(null);
    render(<RangeForm save={save} />);
    const user = userEvent.setup();

    await user.clear(screen.getByLabelText("Low"));
    await user.type(screen.getByLabelText("Low"), "9");
    await user.tab();

    expect(await screen.findByRole("alert")).toHaveTextContent("Must be at least low");
    await expectNoSave(save);
  });

  // The same schema drives the inline errors, through the resolver. Read with getFieldState:
  // formState is a proxy that only tracks what a component read during render.
  it("validates fields against the schema", async () => {
    const { result } = renderHook(() => useAutosaveForm({ schema, defaultValues, save: vi.fn() }));

    act(() => result.current.form.setValue("name", ""));
    await act(async () => {
      expect(await result.current.form.trigger()).toBe(false);
    });
    expect(result.current.form.getFieldState("name").error?.message).toBe("Required");
  });
});
