import { CONTACT_FIELD_DEFS } from "./contact";
import { MISC_FIELD_DEFS } from "./misc";
import type { FieldDef } from "./types";

// Tags each of a group's fields with the group, keeping the group's exact field names as the keys.
const withGroup = <Name extends string>(defs: Record<Name, Omit<FieldDef, "group">>, group: FieldDef["group"]) =>
  Object.fromEntries(Object.entries<Omit<FieldDef, "group">>(defs).map(([name, def]) => [name, { ...def, group }])) as Record<Name, FieldDef>;

// Every field the catalog defines. In its own module (re-exported from index.ts) so person-schema.ts
// can use it without importing index.ts, which exports person-schema.
export const FIELD_DEFS = { ...withGroup(CONTACT_FIELD_DEFS, "contact"), ...withGroup(MISC_FIELD_DEFS, "misc") };

// A field the catalog defines: what a tenant's fields_config may name.
export type FieldName = keyof typeof FIELD_DEFS;

// As a non-empty tuple, the form zod's z.enum takes.
export const FIELD_NAMES = Object.keys(FIELD_DEFS) as [FieldName, ...FieldName[]];
