import { CONTACT_FIELD_DEFS } from "./contact";
import { MISC_FIELD_DEFS } from "./misc";
import type { FieldDef, FieldType, FollowUp, FieldDefaults } from "./types";
import { STATE_OPTIONS } from "./stateOptions";

export type { FieldDef, FieldType, FollowUp, FieldDefaults };
export { CONTACT_FIELD_DEFS, MISC_FIELD_DEFS, STATE_OPTIONS };

export const FIELD_DEFS: Record<string, FieldDef> = {
  ...Object.fromEntries(Object.entries(CONTACT_FIELD_DEFS).map(([k, v]) => [k, { ...v, group: "contact" as const }])),
  ...Object.fromEntries(Object.entries(MISC_FIELD_DEFS).map(([k, v]) => [k, { ...v, group: "misc" as const }])),
};
