import { z } from "zod";
import { personSchema, FIELD_DEFS, type FieldSettings, type FieldName } from "@repo/fields";
import type { FieldsConfig } from "@repo/tenant-config";
import type { Person } from "@repo/types";

// Autosave lazily creates the order once registrant.email is non-empty, so throw if somehow missing.
const REQUIRED_FIELD: FieldName = "email";
const assertRequiredFieldActive = (names: FieldName[]): void => {
  if (!names.includes(REQUIRED_FIELD))
    throw new Error(`fields_config is missing "${REQUIRED_FIELD}", which autosave relies on to start saving a draft`);
};

// fields_config's entries, flattened into the shape personSchema expects.
export const activeFieldNames = (fieldsConfig: FieldsConfig): FieldSettings[] => {
  const settings = [...fieldsConfig.contact, ...fieldsConfig.misc].map(
    ({ name, required, firstPersonOptions }): FieldSettings => ({ name, required, firstPersonOptions })
  );
  assertRequiredFieldActive(settings.map((field) => field.name));
  return settings;
};

// One schema for the whole party: the registrant (personIndex 0, so personSchema applies its
// first-person rules -- the agreement, age options limited to firstPersonOptions) and companions
// (personIndex 1 -- any nonzero value is equivalent, so every companion shares one schema instance).
// Bound to RHF's zodResolver (mode: "onBlur") for live per-field errors and the Continue submit, and
// reused as-is by submitRegistration server-side. Autosave doesn't validate at all: form.getValues()
// already returns current values regardless of whether they're currently valid.
export const buildRegistrationSchema = (fieldsConfig: FieldsConfig) => {
  const fields = activeFieldNames(fieldsConfig);
  return z.object({
    registrant: personSchema(fields, 0),
    companions: z.array(personSchema(fields, 1)), // any nonzero personIndex is equivalent
  });
};

// A new person's starting values: each active field's defaultValue.
export const buildDefaultPerson = (fieldsConfig: FieldsConfig): Person => {
  const entries = [...fieldsConfig.contact, ...fieldsConfig.misc];
  assertRequiredFieldActive(entries.map((entry) => entry.name));

  const person: Record<string, unknown> = {};
  for (const entry of entries) {
    const isCheckbox = FIELD_DEFS[entry.name].type === "checkbox";
    person[entry.name] = entry.defaultValue ?? (isCheckbox ? [] : "");
  }
  return person as Person;
};
