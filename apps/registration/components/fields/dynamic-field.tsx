import type { FieldType } from "@repo/fields";
import type { FieldProps } from "./types";
import { TextField } from "./text-field";
import { AutocompleteField } from "./autocomplete-field";
import { RadioField } from "./radio-field";
import { CheckboxGroupField } from "./checkbox-group-field";
import { TextareaField } from "./textarea-field";

const FIELD_COMPONENTS = {
  text: TextField,
  email: TextField,
  phone: TextField,
  address: TextField,
  autocomplete: AutocompleteField,
  radio: RadioField,
  checkbox: CheckboxGroupField,
  textarea: TextareaField,
} satisfies Record<FieldType, (props: FieldProps) => React.ReactElement>;

export function DynamicField(props: FieldProps) {
  const Component = FIELD_COMPONENTS[props.fieldConfig.type];
  return <Component {...props} />;
}
