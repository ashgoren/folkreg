import { contactFields } from "./contact";
import { miscFields } from "./misc";
import type { FieldDef, FieldType, FollowUp, FieldDefaults } from "./types";
import { STATE_OPTIONS } from "./stateOptions";

export type { FieldDef, FieldType, FollowUp, FieldDefaults };
export { contactFields, miscFields, STATE_OPTIONS };

export const FIELD_DEFINITIONS: Record<string, FieldDef> = {
  ...contactFields,
  ...miscFields,
};
