"use client";

import { useEffect } from "react";
import { useForm, type DefaultValues, type FieldValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useAutosave } from "./useAutosave";

/**
 * A react-hook-form form that autosaves through useAutosave: every config page except Fields.
 *
 * Validation runs on blur (mode "onBlur"), so a field's error shows as soon as the organizer
 * leaves it -- there's no submit for errors to wait for. Every change is checked against the
 * schema before saving: an invalid value is never sent (its inline error already explains why
 * nothing saved), and a valid one is saved as the schema's *parsed* output, so any transform the
 * schema applies is part of what gets stored rather than silently dropped.
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

  const { saveDebounced, isPending, savedRecently } = useAutosave<TOutput>(save);

  useEffect(() => {
    const subscription = form.watch((values) => {
      const parsed = schema.safeParse(values);
      if (parsed.success) saveDebounced(parsed.data);
    });
    return () => subscription.unsubscribe();
  }, [form, schema, saveDebounced]);

  return { form, isPending, savedRecently };
}
