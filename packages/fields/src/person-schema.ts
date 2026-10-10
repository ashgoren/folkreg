// Validation for one person in an order, built from the catalog's rules and a tenant's per-field
// settings. The catalog says what a field's value looks like (its type, its format, any follow-up,
// first-person or cross-field rule); the tenant says whether it's required. The registration app's
// People step validates each person with this, client side through react-hook-form's zodResolver
// and again on the server.

import { z } from "zod";
import { FIELD_DEFS } from "./catalog";
import type { FieldType } from "./types";

// The tenant's settings for a field that matter to validation (a subset of its fields_config entry).
export type FieldSettings = { required?: boolean };

// For a required field the catalog gives no message of its own.
const FALLBACK_REQUIRED_MESSAGES: Record<FieldType, string> = {
  text: "Please fill this in.",
  email: "Please fill this in.",
  phone: "Please fill this in.",
  address: "Please fill this in.",
  autocomplete: "Please fill this in.",
  textarea: "Please fill this in.",
  radio: "Please choose one.",
  checkbox: "Please choose at least one.",
};

const isBlank = (value: unknown) => (Array.isArray(value) ? value.length === 0 : typeof value !== "string" || value.trim() === "");

// A checkbox field's value is the list of checked options; any other field's is a single value.
const hasValue = (value: unknown, option: string) => (Array.isArray(value) ? value.includes(option) : value === option);

/**
 * The zod schema for one person, given the tenant's settings for each active field (keyed by field
 * name) and the person's position in the order (0 is the one registering).
 *
 * Every problem is reported at the path of the field it's about -- a follow-up's at its own key --
 * so a form shows each error under its own input. Values that aren't fields (e.g. an admission
 * amount) pass through untouched.
 */
export const personSchema = (settingsByField: Record<string, FieldSettings>, personIndex: number) => {
  const isFirstPerson = personIndex === 0;
  const fields = Object.entries(settingsByField)
    .map(([name, settings]) => {
      const def = FIELD_DEFS[name];
      // Stored config naming a field the catalog lacks (e.g. one since renamed) would otherwise be
      // silently left unvalidated.
      if (!def) throw new Error(`Unknown field: ${name}`);
      return { name, def, settings };
    })
    // Not asked of anyone after the first person, so there's nothing of theirs to check.
    .filter(({ def }) => isFirstPerson || !def.firstPersonOnly);

  const shape: Record<string, z.ZodType> = {};
  for (const { name, def } of fields) {
    shape[name] = def.type === "checkbox" ? z.array(z.string()) : z.string();
    if (def.followUp) shape[def.followUp.storageKey] = z.string().optional();
  }

  return z.looseObject(shape).superRefine((person, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });

    for (const { name, def, settings } of fields) {
      const value = person[name];

      // A blank value is only ever "missing", never "malformed": the format applies to what's typed.
      if (isBlank(value)) {
        if (settings.required) issue(name, def.requiredMessage ?? FALLBACK_REQUIRED_MESSAGES[def.type]);
      } else if (def.format && typeof value === "string") {
        const result = def.format.safeParse(value);
        if (!result.success) issue(name, result.error.issues[0]!.message);
      }

      if (isFirstPerson && def.firstPersonOptions && typeof value === "string" && value !== ""
        && !def.firstPersonOptions.values.includes(value)) {
        issue(name, def.firstPersonOptions.message);
      }

      if (def.followUp && hasValue(value, def.followUp.triggerValue) && isBlank(person[def.followUp.storageKey])) {
        issue(def.followUp.storageKey, def.followUp.requiredMessage);
      }

      const crossError = def.crossValidation?.(person);
      if (crossError) issue(name, crossError);
    }
  });
};
