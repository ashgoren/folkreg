// A number Input wired to react-hook-form via Controller, mapping a blank input to
// NaN (rather than 0) so a cleared required field shows a validation error instead of
// getting stuck re-inserting a 0 that can't be backspaced over.

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";

export function NumberField<TFieldValues extends FieldValues>({
  control,
  name,
  id,
  label,
  required,
  description,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  id: string;
  label: string;
  required?: boolean;
  description?: string;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const value = field.value as number;
        return (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor={id} required={required}>{label}</FormLabel>
            {description && <FieldDescription>{description}</FieldDescription>}
            <Input
              id={id}
              type="number"
              aria-invalid={fieldState.invalid}
              value={Number.isNaN(value) ? "" : value}
              onChange={(e) => field.onChange(e.target.value === "" ? NaN : Number(e.target.value))}
              onBlur={field.onBlur}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        );
      }}
    />
  );
}
