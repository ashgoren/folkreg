import { z } from "zod";
import { personSchema, type FieldName } from "@repo/fields";
import type { FieldsConfig } from "@repo/tenant-config";
import type { Order, Person } from "@repo/types";
import { fieldConfig, type FieldConfig } from "@/components/fields/types";

// The registration form requires email to be included in fields_config.
const REQUIRED_FIELD: FieldName = "email";
const assertRequiredFieldActive = (names: FieldName[]): void => {
  if (!names.includes(REQUIRED_FIELD))
    throw new Error(`fields_config is missing "${REQUIRED_FIELD}"`);
};

// The party being registered: shared by RegistrationForm and actions.ts.
export type RegistrationParty = { registrant: Person; companions: Person[] };

// The list + order + full config (tenant settings merged with catalog behavior) of active fields for this tenant.
export const activeFields = (fieldsConfig: FieldsConfig): FieldConfig[] => {
  const fields = [...fieldsConfig.contact, ...fieldsConfig.misc];
  assertRequiredFieldActive(fields.map((field) => field.name));
  return fields.map(fieldConfig);
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

// Everything RegistrationForm needs to resume a draft, from the order as it's actually stored.
export const buildInitialOrder = (order: Order | null): { id: string; updatedAt: string; registrant: Person; companions: Person[] } | null =>
  order && { id: order.id, updatedAt: order.updated_at, registrant: order.people[0]!, companions: order.people.slice(1) };
