// A single-line text Input wired to react-hook-form via Controller.

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";

export function TextField<TFieldValues extends FieldValues>({
  control,
  name,
  id,
  label,
  type = "text",
  autoComplete,
  required,
  description,
  placeholder,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  id: string;
  label: string;
  type?: "text" | "email" | "url";
  autoComplete: string;
  required?: boolean;
  description?: string;
  placeholder?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FormLabel htmlFor={id} required={required}>{label}</FormLabel>
          {description && <FieldDescription>{description}</FieldDescription>}
          {/* An optional setting with no value yet (e.g. a field's placeholder) shows as blank; an
              undefined value would make React treat the input as uncontrolled. */}
          <Input {...field} value={field.value ?? ""} id={id} type={type} autoComplete={autoComplete} placeholder={placeholder} aria-invalid={fieldState.invalid} />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
