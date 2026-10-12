import type { Control, FieldValues } from "react-hook-form";
import type { FieldEntry } from "@repo/tenant-config";

// Every field component's entry point: control/name follow react-hook-form's own Controller
// convention, except name stays a plain string - a tenant's active fields aren't known until runtime.
export interface FieldProps {
  control: Control<FieldValues>;
  name: string;
  entry: FieldEntry; // tenant's settings for this field
  isRegistrant: boolean;
}
