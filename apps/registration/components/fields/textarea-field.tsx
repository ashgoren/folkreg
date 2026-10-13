import { Controller } from "react-hook-form";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Textarea } from "@/components/ui/textarea";
import type { FieldProps } from "./types";

export function TextareaField({ control, name, fieldConfig }: FieldProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} style={{ gridColumn: `span ${fieldConfig.width}` }}>
          <FormLabel htmlFor={name} required={fieldConfig.required}>{fieldConfig.label}</FormLabel>
          {fieldConfig.title && <FieldDescription>{fieldConfig.title}</FieldDescription>}
          <Textarea
            {...field}
            value={typeof field.value === "string" ? field.value : ""}
            id={name}
            rows={fieldConfig.rows ?? undefined}
            placeholder={fieldConfig.placeholder}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
