import { Controller } from "react-hook-form";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { gridColumnStyle, type FieldProps } from "./types";

export function RadioField({ control, name, fieldConfig, isRegistrant }: FieldProps) {
  const options = fieldConfig.options ?? [];
  // The registrant's own age can be limited to a subset of the tenant's options.
  const allowedValues = isRegistrant && fieldConfig.canLimitFirstPerson && fieldConfig.firstPersonOptions ? fieldConfig.firstPersonOptions : null;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <>
          <Field data-invalid={fieldState.invalid} style={gridColumnStyle(fieldConfig.width)}>
            <FormLabel required={fieldConfig.required}>{fieldConfig.label}</FormLabel>
            {fieldConfig.title && <FieldDescription>{fieldConfig.title}</FieldDescription>}
            <RadioGroup value={typeof field.value === "string" ? field.value : ""} onValueChange={field.onChange} onBlur={field.onBlur} aria-invalid={fieldState.invalid}>
              {options.map((option) => (
                <label key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem value={option.value} disabled={allowedValues !== null && !allowedValues.includes(option.value)} />
                  {option.label}
                </label>
              ))}
            </RadioGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        </>
      )}
    />
  );
}
