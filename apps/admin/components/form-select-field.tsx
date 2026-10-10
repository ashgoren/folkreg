// A native <select> wired to react-hook-form via Controller, styled like Input. Native rather than
// a custom dropdown: for a short fixed list it's keyboard- and screen-reader-friendly as is, and
// typing a letter jumps to the matching option.

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";

export function SelectField<TFieldValues extends FieldValues>({
  control,
  name,
  id,
  label,
  description,
  options,
  required,
}: {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  id: string;
  label: string;
  description?: string;
  options: readonly { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FormLabel htmlFor={id} required={required}>{label}</FormLabel>
          {description && <FieldDescription>{description}</FieldDescription>}
          <select
            {...field}
            id={id}
            aria-invalid={fieldState.invalid}
            className="h-8 w-fit min-w-48 rounded-lg border border-input bg-transparent px-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
