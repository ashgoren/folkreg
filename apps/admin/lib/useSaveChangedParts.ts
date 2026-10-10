"use client";

import { useRef } from "react";
import type { z } from "zod";
import { serializeValues } from "./serialize-values";

/**
 * The values under one part's keys: those of its zod object schema, in that schema's order. For a
 * `split`. The values are already validated (they're the form's parsed output), so this only picks
 * keys -- parsing them again would apply any schema transform a second time.
 */
export const pickKeys = <TSchema extends z.ZodObject>(schema: TSchema, data: object): z.output<TSchema> =>
  Object.fromEntries(Object.keys(schema.shape).map((key) => [key, (data as Record<string, unknown>)[key]])) as z.output<TSchema>;

/**
 * A useAutosaveForm `save` for a form whose values are saved in parts, each by its own server
 * action -- e.g. Payments' payments_config and its tenant_secrets. Each save sends only the parts
 * that differ from what that part last saved, so a switch flip writes the config alone and never
 * resends the secrets.
 *
 * What each part last saved starts as the form's initial values, and moves on only when that
 * part's save succeeds: a part whose save failed still differs next time, and is sent again then. Parts
 * are saved independently, so one failing doesn't stop the others; the first error is returned
 * for the toast.
 */
export function useSaveChangedParts<TData, TParts extends Record<string, unknown>>({ initial, split, save }: {
  /** The form's values as the page loaded them. */
  initial: TData;
  /** The form's values divided into the parts. */
  split: (data: TData) => TParts;
  /** Each part's server action. */
  save: { [K in keyof TParts]: (part: TParts[K]) => Promise<string | null> };
}) {
  // Through `split`, like every later save, so a part's values are compared in the same shape and
  // key order each time (JSON keeps keys in insertion order; pickKeys uses the schema's).
  const serializeParts = (data: TData) =>
    Object.fromEntries(Object.entries(split(data)).map(([key, part]) => [key, serializeValues(part)])) as Record<keyof TParts, string>;
  const lastSaved = useRef<Record<keyof TParts, string> | null>(null);
  lastSaved.current ??= serializeParts(initial);

  return async (data: TData): Promise<string | null> => {
    const parts = split(data);
    let firstError: string | null = null;
    for (const key of Object.keys(parts) as (keyof TParts)[]) {
      const serialized = serializeValues(parts[key]);
      if (serialized === lastSaved.current![key]) continue;
      const error = await save[key](parts[key]);
      if (error) firstError ??= error;
      else lastSaved.current![key] = serialized;
    }
    return firstError;
  };
}
