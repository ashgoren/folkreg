import { z } from "zod";
import { personSchema, REQUIRED_FIELD_NAMES } from "@repo/fields";
import type { FieldsConfig } from "@repo/tenant-config";
import type { Order, Person } from "@repo/types";
import { fieldConfig, type FieldConfig } from "@/components/fields/types";

// The party being registered: shared by RegistrationForm and actions.ts.
export type RegistrationParty = { registrant: Person; companions: Person[] };

// All fields used by this tenant (including their full config, which is tenant fields_config merged w/ catalog config).
// Read by buildRegistrationSchema, buildDefaultPerson, and isPersonValid.
export const activeFields = (fieldsConfig: FieldsConfig): FieldConfig[] => {
  const fields = [...fieldsConfig.contact, ...fieldsConfig.misc];
  const fieldNames = fields.map((field) => field.name);
  const missing = REQUIRED_FIELD_NAMES.filter((name) => !fieldNames.includes(name));
  if (missing.length > 0) throw new Error(`fields_config is missing ${missing.map((name) => `"${name}"`).join(", ")}`);
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

// Helper to check if one person's current data passes personSchema.
// Used on page mount to decide which person, if any, starts in edit mode.
export const isPersonValid = (fieldsConfig: FieldsConfig, person: Person, personIndex: number): boolean =>
  personSchema(activeFields(fieldsConfig), personIndex).safeParse(person).success;

// A new person's starting values: each active field's defaultValue. Used both for a freshly
// appended companion and (via buildInitialValues below) a brand-new registrant.
export const buildDefaultPerson = (fieldsConfig: FieldsConfig): Person => {
  const person: Record<string, unknown> = {};
  for (const field of activeFields(fieldsConfig)) {
    const isCheckbox = field.type === "checkbox";
    person[field.name] = field.defaultValue ?? (isCheckbox ? [] : "");
  }
  return person as Person;
};

// Everything RegistrationForm needs to resume a draft, from the order as it's actually stored.
// Doesn't touch fields_config at all -- this is purely storage shape (Order.people, a flat array)
// to party shape, independent of which fields a tenant has active.
export const buildInitialOrder = (order: Order | null): { id: string; updatedAt: string; registrant: Person; companions: Person[] } | null =>
  order && { id: order.id, updatedAt: order.updated_at, registrant: order.people[0]!, companions: order.people.slice(1) };

// RegistrationForm's starting form values from resumed draft or default.
export const buildInitialValues = (fieldsConfig: FieldsConfig, initialOrder: RegistrationParty | null): RegistrationParty =>
  initialOrder ?? { registrant: buildDefaultPerson(fieldsConfig), companions: [] };
