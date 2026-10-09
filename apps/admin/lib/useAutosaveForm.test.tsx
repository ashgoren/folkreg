import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { z } from "zod";
import { useAutosaveForm } from "./useAutosaveForm";

// A schema whose parsed output differs from its input (the transform trims), so the tests can
// tell which of the two was saved.
const schema = z.object({ name: z.string().min(1, "Required").transform((name) => name.trim()) });

// Advancing fake timers inside an async act() also flushes what the elapsed debounce kicks off
// (startTransition -> save). Same helper as useAutosave.test.tsx.
const advance = (ms: number) => act(async () => {
  await vi.advanceTimersByTimeAsync(ms);
});

const renderForm = (save = vi.fn().mockResolvedValue(null)) => {
  const { result } = renderHook(() => useAutosaveForm({ schema, defaultValues: { name: "start" }, save }));
  return { result, save };
};

describe("useAutosaveForm", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("seeds the form with the default values", () => {
    const { result } = renderForm();
    expect(result.current.form.getValues()).toEqual({ name: "start" });
  });

  // Saving the raw value would silently discard whatever the schema's transform does.
  it("saves a valid edit as the schema's parsed output, after the debounce", async () => {
    const { result, save } = renderForm();

    act(() => result.current.form.setValue("name", "  edited  "));
    await advance(499);
    expect(save).not.toHaveBeenCalled();

    await advance(1);
    expect(save).toHaveBeenCalledExactlyOnceWith({ name: "edited" });
  });

  it("never saves an invalid edit", async () => {
    const { result, save } = renderForm();

    act(() => result.current.form.setValue("name", ""));
    await advance(1000);
    expect(save).not.toHaveBeenCalled();
  });

  // The same schema drives the inline errors, through the resolver. Read with getFieldState:
  // formState is a proxy that only tracks what a component read during render, which this test
  // doesn't do.
  it("validates fields against the schema", async () => {
    const { result } = renderForm();

    act(() => result.current.form.setValue("name", ""));
    await act(async () => {
      expect(await result.current.form.trigger()).toBe(false);
    });
    expect(result.current.form.getFieldState("name").error?.message).toBe("Required");
  });
});
