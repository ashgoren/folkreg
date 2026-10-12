import { Controller } from "react-hook-form";
import { FIELD_DEFS } from "@repo/fields";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import type { FieldProps } from "./types";

// text, email, phone, and address all render the same single-line Input, differing only in the
// HTML type (for the browser's own keyboard/validation hints) and autoComplete, both read from the
// catalog rather than passed in -- every text-shaped field already declares them there.
const HTML_TYPE: Record<string, string> = { email: "email", phone: "tel" };

export function TextField({ control, name, entry }: FieldProps) {
  const def = FIELD_DEFS[entry.name];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} style={entry.width ? { gridColumn: `span ${entry.width}` } : undefined}>
          <FormLabel htmlFor={name} required={entry.required}>{entry.label}</FormLabel>
          {entry.title && <FieldDescription>{entry.title}</FieldDescription>}
          <Input
            {...field}
            value={typeof field.value === "string" ? field.value : ""}
            id={name}
            type={HTML_TYPE[def.type] ?? "text"}
            autoComplete={def.autoComplete}
            placeholder={entry.placeholder}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
