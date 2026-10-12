import { FIELD_DEFS, type FieldType } from "@repo/fields";
import { TextField } from "./text-field";
import { StateSelectField } from "./state-select-field";
import { RadioField } from "./radio-field";
import { CheckboxGroupField } from "./checkbox-group-field";
import { TextareaField } from "./textarea-field";
import type { FieldProps } from "./types";

// A lookup object, not a switch: TypeScript refuses to compile if a FieldType is ever added here
// without a matching component, where a switch with no exhaustiveness check would just silently
// render nothing for it. text/email/phone/address share one component -- they're all a single-line
// Input, differing only in the HTML type and autoComplete, both already read from the catalog.
const FIELD_COMPONENTS = {
  text: TextField,
  email: TextField,
  phone: TextField,
  address: TextField,
  autocomplete: StateSelectField,
  radio: RadioField,
  checkbox: CheckboxGroupField,
  textarea: TextareaField,
} satisfies Record<FieldType, (props: FieldProps) => React.ReactElement>;

export function DynamicField(props: FieldProps) {
  const Component = FIELD_COMPONENTS[FIELD_DEFS[props.entry.name].type];
  return <Component {...props} />;
}
