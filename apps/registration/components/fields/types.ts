import type { Control, FieldValues } from "react-hook-form";
import { FIELD_DEFS, type FieldDef } from "@repo/fields";
import type { ActiveField } from "@repo/tenant-config";

// Everything there is to know about one field: the tenant's settings (ActiveField) merged with the
// catalog's behavior for the field (FieldDef).
export type FieldConfig = FieldDef & ActiveField;
export const fieldConfig = (field: ActiveField): FieldConfig => ({ ...FIELD_DEFS[field.name], ...field });

export type FieldGroups = { contact: FieldConfig[]; misc: FieldConfig[] };

// Every field component's entry point: control/name follow react-hook-form's own Controller
// convention, except name stays a plain string b/c a tenant's active fields aren't known until runtime.
export interface FieldProps {
  control: Control<FieldValues>;
  name: string;
  fieldConfig: FieldConfig;
  isRegistrant: boolean;
}
