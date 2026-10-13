import { z } from "zod";
import { personSchema, type FieldName } from "@repo/fields";
import type { FieldsConfig } from "@repo/tenant-config";
import type { Person } from "@repo/types";
import { fieldConfig, type FieldConfig } from "@/components/fields/types";

// The registration form requires email to be included in fields_config.
const REQUIRED_FIELD: FieldName = "email";
const assertRequiredFieldActive = (names: FieldName[]): void => {
  if (!names.includes(REQUIRED_FIELD))
    throw new Error(`fields_config is missing "${REQUIRED_FIELD}"`);
};

// The list + order + full config (tenant settings merged with catalog behavior) of active fields for this tenant.
export const activeFields = (fieldsConfig: FieldsConfig): FieldConfig[] => {
  const fields = [...fieldsConfig.contact, ...fieldsConfig.misc];
  assertRequiredFieldActive(fields.map((field) => field.name));
  return fields.map(fieldConfig);
};

// One schema for the whole party, including special rules for the first person (agreement, age options).
// Used by RHF zodResolver for per-field errors + save/continue submits, and also by submitRegistration
// server-side. Autosave doesn't validate.
export const buildRegistrationSchema = (fieldsConfig: FieldsConfig) => {
  const fields = activeFields(fieldsConfig);
  return z.object({
    registrant: personSchema(fields, 0),
    companions: z.array(personSchema(fields, 1)), // any nonzero personIndex is equivalent
  });
};

// A new person's starting values: each active field's defaultValue.
export const buildDefaultPerson = (fieldsConfig: FieldsConfig): Person => {
  const person: Record<string, unknown> = {};
  for (const field of activeFields(fieldsConfig)) {
    const isCheckbox = field.type === "checkbox";
    person[field.name] = field.defaultValue ?? (isCheckbox ? [] : "");
  }
  return person as Person;
};

// Helper to check if one person's current data passes personSchema.
// Used on page mount to decide which person, if any, starts in edit mode.
export const isPersonValid = (fieldsConfig: FieldsConfig, person: Person, personIndex: number): boolean =>
  personSchema(activeFields(fieldsConfig), personIndex).safeParse(person).success;
