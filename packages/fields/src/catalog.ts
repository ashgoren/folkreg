import { CONTACT_FIELD_DEFS } from "./contact";
import { MISC_FIELD_DEFS } from "./misc";
import type { FieldDef } from "./types";

// Every field the catalog defines, each tagged with its group. In its own module (re-exported from
// index.ts) so person-schema.ts can use it without importing index.ts, which exports person-schema.
export const FIELD_DEFS: Record<string, FieldDef> = {
  ...Object.fromEntries(Object.entries(CONTACT_FIELD_DEFS).map(([k, v]) => [k, { ...v, group: "contact" as const }])),
  ...Object.fromEntries(Object.entries(MISC_FIELD_DEFS).map(([k, v]) => [k, { ...v, group: "misc" as const }])),
};
