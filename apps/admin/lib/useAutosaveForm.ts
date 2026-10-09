"use client";

import { useCallback, useEffect, useRef, type FormEvent } from "react";
import { useForm, type DefaultValues, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useAutosave } from "./useAutosave";

// Input types where the organizer types a value, as opposed to clicking one. Everything else that
// can take focus here (checkbox/radio/color inputs, and the buttons Radix renders for switches,
// radios, and checkboxes) is a complete gesture.
const NON_TEXT_INPUT_TYPES = new Set(["checkbox", "radio", "color", "range", "file", "button", "submit", "reset", "hidden"]);

const isTextEntry = (element: Element | null) =>
  element instanceof HTMLTextAreaElement
  || (element instanceof HTMLInputElement && !NON_TEXT_INPUT_TYPES.has(element.type));

/**
 * A react-hook-form form that autosaves through useAutosave: every config page except Fields.
 *
 * When a change saves depends on how it was made:
 * - Typing into a text field saves when the field loses focus, the same moment its validation
 *   runs (mode "onBlur"). What's saved is exactly the value just validated and on screen.
 * - Other changes (switch, radio, checkbox, drag, add/remove) save immediately.
 *
 * A change is only saved if the whole form passes the schema, and as the schema's *parsed* output,
 * so any transform the schema applies is part of what gets stored rather than silently dropped.
 * An invalid value is never sent; its inline error explains why nothing saved.
 *
 * Spread `formProps` onto the page's <form>: React's onBlur on a form fires when any field inside
 * it loses focus, which is what saves a text edit. It also blocks submit, since autosave replaced
 * the Save button but Enter in a field would still submit the form.
 *
 * TInput is what the form's fields edit, TOutput what a successful parse produces and save
 * receives. They differ only for a schema with a transform.
 *
 * Callers read a field's current value with useWatch({ control: form.control, name }), not
 * form.watch(name). The React Compiler skips code that calls useForm (react-hook-form is on its
 * incompatible-library list), but it does compile a form component that only calls this hook --
 * and there it memoizes form.watch(name) on the never-changing form object, so the value would
 * never update. useWatch is a hook with its own subscription, which the compiler handles.
 */
export function useAutosaveForm<TInput extends FieldValues, TOutput>({ schema, defaultValues, save }: {
  schema: z.ZodType<TOutput, TInput>;
  defaultValues: DefaultValues<TInput>;
  save: (data: TOutput) => Promise<string | null>;
}) {
  const form = useForm<TInput, unknown, TOutput>({
    mode: "onBlur",
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { saveNow, isPending, savedRecently } = useAutosave<TOutput>(save);

  // A text edit made since the last blur, waiting to be saved when its field loses focus.
  const textEditPendingRef = useRef(false);

  // A change that can't save shows every error, not just the edited field's: onBlur mode only
  // validates the field that lost focus, and a rule spanning two fields (Admissions' "default must
  // be between min and max") puts its error on only one of them. Every page loads valid, so the
  // errors this shows are ones the organizer's own edits caused.
  const saveIfValid = useCallback((values: unknown) => {
    const parsed = schema.safeParse(values);
    if (parsed.success) saveNow(parsed.data);
    else void form.trigger();
  }, [form, schema, saveNow]);

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (isTextEntry(document.activeElement)) {
        textEditPendingRef.current = true;
        return;
      }
      saveIfValid(values);
    });
    return () => subscription.unsubscribe();
  }, [form, saveIfValid]);

  const onBlur = useCallback(() => {
    if (!textEditPendingRef.current) return;
    textEditPendingRef.current = false;
    saveIfValid(form.getValues());
  }, [form, saveIfValid]);

  const onSubmit = useCallback((event: FormEvent) => event.preventDefault(), []);

  return { form, formProps: { onBlur, onSubmit }, isPending, savedRecently };
}
