import { z } from "zod";
import { personSchema, REQUIRED_FIELD_NAMES } from "@repo/fields";
import type { FieldsConfig } from "@repo/tenant-config";
import type { Person } from "@repo/types";
import { fieldConfig, type FieldConfig, type FieldGroups } from "@/components/fields/types";

export type RegistrationParty = { registrant: Person; companions: Person[] };

// A tenant's active fields, each with its full config: the tenant settings + catalog).
export const activeFieldGroups = (fieldsConfig: FieldsConfig): FieldGroups => {
  const fieldNames = [...fieldsConfig.contact, ...fieldsConfig.misc].map((field) => field.name);
  const missing = REQUIRED_FIELD_NAMES.filter((name) => !fieldNames.includes(name));
  if (missing.length > 0) throw new Error(`fields_config is missing ${missing.map((name) => `"${name}"`).join(", ")}`);
  return { contact: fieldsConfig.contact.map(fieldConfig), misc: fieldsConfig.misc.map(fieldConfig) };
};

// Same fields in one list, for what treats every field alike: buildRegistrationSchema, buildDefaultPerson, isPersonValid.
export const activeFields = (fieldsConfig: FieldsConfig): FieldConfig[] => {
  const { contact, misc } = activeFieldGroups(fieldsConfig);
  return [...contact, ...misc];
};

// One schema for the whole party, including special rules for the first person (agreement, age options).
// Used by RHF zodResolver for per-field errors + save/continue submits, and also by submitRegistration
// server-side. Autosave doesn't validate.
//
// The cast: personSchema's shape is a dynamic z.looseObject (whatever fields_config activates), not
// literally Person -- @repo/fields can't import Person to type it precisely without a circular
// package dependency (Person lives in @repo/types, which depends on @repo/tenant-config, which
// depends on @repo/fields). This is the one place that reconciles the two, so neither caller
// (RegistrationForm's zodResolver, submitRegistration's safeParse) needs its own cast.
export const buildRegistrationSchema = (fieldsConfig: FieldsConfig): z.ZodType<RegistrationParty, RegistrationParty> => {
  const fields = activeFields(fieldsConfig);
  return z.object({
    registrant: personSchema(fields, 0),
    companions: z.array(personSchema(fields, 1)), // any nonzero personIndex is equivalent
  }) as unknown as z.ZodType<RegistrationParty, RegistrationParty>;
};

// Helper to check if one person's current data passes personSchema.
// Used on page mount to decide which person, if any, starts in edit mode.
export const isPersonValid = (fieldsConfig: FieldsConfig, person: Person, personIndex: number): boolean =>
  personSchema(activeFields(fieldsConfig), personIndex).safeParse(person).success;

// A new person's starting values: each active field's defaultValue. Used both for a freshly
// appended companion and, in RegistrationForm, a brand-new registrant.
export const buildDefaultPerson = (fieldsConfig: FieldsConfig): Person => {
  const person: Record<string, unknown> = {};
  for (const field of activeFields(fieldsConfig)) {
    const isCheckbox = field.type === "checkbox";
    person[field.name] = field.defaultValue ?? (isCheckbox ? [] : "");
  }
  return person as Person;
};
