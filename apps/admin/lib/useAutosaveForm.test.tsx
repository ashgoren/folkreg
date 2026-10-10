import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import { useFieldArray, useFormState } from "react-hook-form";
import { toast } from "sonner";
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

// A minimal page: one text field (showing its error), one checkbox, and formProps on the <form>,
// the way every config page wires the hook. When a save happens depends on focus and blur, which
// only a rendered form has. The error is read with useFormState for the reason given on RangeForm.
function TestForm({ save }: { save: (data: z.output<typeof schema>) => Promise<string | null> }) {
  const { form, formProps } = useAutosaveForm({ label: "Test", schema, defaultValues, save });
  const { errors } = useFormState({ control: form.control, name: "name" });
  return (
    <form {...formProps}>
      <label>Name <input {...form.register("name")} /></label>
      {errors.name && <p role="alert">{errors.name.message}</p>}
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
  const { form, formProps } = useAutosaveForm({ label: "Test", schema: rangeSchema, defaultValues: { low: 1, high: 5 }, save });
  const { errors } = useFormState({ control: form.control, name: "high" });
  return (
    <form {...formProps}>
      <label>Low <input type="number" {...form.register("low", { valueAsNumber: true })} /></label>
      <label>High <input type="number" {...form.register("high", { valueAsNumber: true })} /></label>
      {errors.high && <p role="alert">{errors.high.message}</p>}
    </form>
  );
}

// A page with a list edited through useFieldArray, like Admissions' tiered categories and the
// Fields page's groups.
const listSchema = z.object({ items: z.array(z.object({ label: z.string() })) });

function ListForm({ save }: { save: (data: z.output<typeof listSchema>) => Promise<string | null> }) {
  const { form, formProps } = useAutosaveForm({ label: "Test", schema: listSchema, defaultValues: { items: [{ label: "a" }] }, save });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  return (
    <form {...formProps}>
      {fields.map((field, index) => (
        <button key={field.id} type="button" onClick={() => remove(index)}>Remove {index}</button>
      ))}
      <button type="button" onClick={() => append({ label: "b" })}>Add</button>
    </form>
  );
}

const renderForm = () => {
  const save = vi.fn().mockResolvedValue(null);
  const { unmount } = render(<TestForm save={save} />);
  return { save, unmount, user: userEvent.setup(), name: screen.getByLabelText("Name") };
};

describe("useAutosaveForm", () => {
  beforeEach(() => {
    vi.mocked(toast.error).mockClear();
  });
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

  // A change that can't save shows every error, but mustn't move the cursor: jumping to the
  // invalid field would interrupt whatever the organizer just clicked or is about to type.
  it("leaves focus where it is when a change can't save", async () => {
    const { save, user, name } = renderForm();

    await user.clear(name);
    const agree = screen.getByLabelText("Agree");
    await user.click(agree); // blurs the now-invalid name, then saves the click: both fail

    expect(await screen.findByRole("alert")).toHaveTextContent("Required");
    expect(agree).toHaveFocus();
    await expectNoSave(save);
  });

  // Errors show when a field is left, not on each keystroke -- also after the form has saved
  // once, so typing an email doesn't flag it as invalid before it's finished.
  it("keeps validating on blur, not while typing, after a save", async () => {
    const { save, user, name } = renderForm();

    await user.type(name, "x");
    await user.tab();
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());

    await user.clear(name); // invalid, but still being edited
    expect(screen.queryByRole("alert")).toBeNull();

    await user.tab();
    expect(await screen.findByRole("alert")).toHaveTextContent("Required");
  });

  // Otherwise Firefox (and sometimes Safari) restores typed values on reload without a change
  // event, showing values react-hook-form doesn't know about.
  it("turns off the browser's restoring of field values on reload", () => {
    renderForm();
    expect(screen.getByLabelText("Name").closest("form")).toHaveAttribute("autocomplete", "off");
  });

  // Navigating away through the app unmounts the page right after the click's blur shows the
  // errors. The toast is what's left to tell the organizer the edit didn't save.
  describe("leaving the page", () => {
    it("toasts, naming the page, when the latest change was invalid", async () => {
      const { user, name, unmount } = renderForm();

      await user.clear(name);
      await user.tab();
      unmount();

      expect(toast.error).toHaveBeenCalledExactlyOnceWith("Your last change on Test wasn't saved: a field is invalid.");
    });

    it("doesn't toast once a later change has saved", async () => {
      const { save, user, name, unmount } = renderForm();

      await user.clear(name);
      await user.tab();
      await user.type(name, "fixed");
      await user.tab();
      await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
      unmount();

      expect(toast.error).not.toHaveBeenCalled();
    });

    it("doesn't toast when nothing was changed", () => {
      const { unmount } = renderForm();
      unmount();
      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  // useFieldArray notifies the form's watchers when it mounts and after each of its operations,
  // whether or not anything changed. Only an actual change is an edit to save.
  describe("a list edited through useFieldArray", () => {
    it("doesn't save when the page loads", async () => {
      const save = vi.fn().mockResolvedValue(null);
      render(<ListForm save={save} />);
      await expectNoSave(save);
    });

    it("saves each add or remove once", async () => {
      const save = vi.fn().mockResolvedValue(null);
      render(<ListForm save={save} />);
      const user = userEvent.setup();

      await user.click(screen.getByRole("button", { name: "Add" }));
      await vi.waitFor(() => expect(save).toHaveBeenCalledExactlyOnceWith({ items: [{ label: "a" }, { label: "b" }] }));

      await user.click(screen.getByRole("button", { name: "Remove 0" }));
      await vi.waitFor(() => expect(save).toHaveBeenLastCalledWith({ items: [{ label: "b" }] }));
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(save).toHaveBeenCalledTimes(2);
    });
  });

  // The same schema drives the inline errors, through the resolver. Read with getFieldState:
  // formState is a proxy that only tracks what a component read during render.
  it("validates fields against the schema", async () => {
    const { result } = renderHook(() => useAutosaveForm({ label: "Test", schema, defaultValues, save: vi.fn() }));

    act(() => result.current.form.setValue("name", ""));
    await act(async () => {
      expect(await result.current.form.trigger()).toBe(false);
    });
    expect(result.current.form.getFieldState("name").error?.message).toBe("Required");
  });
});
