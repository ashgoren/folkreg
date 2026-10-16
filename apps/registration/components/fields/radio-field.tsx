import { Controller } from "react-hook-form";
import { hasValue } from "@repo/fields";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FollowUpField } from "./follow-up-field";
import type { FieldProps } from "./types";

export function RadioField({ control, name, fieldConfig, isRegistrant }: FieldProps) {
  const options = fieldConfig.options ?? [];
  // The registrant's own age can be limited to a subset of the tenant's options.
  const allowedValues = isRegistrant && fieldConfig.canLimitFirstPerson && fieldConfig.firstPersonOptions ? fieldConfig.firstPersonOptions : null;
  const parentPath = name.slice(0, name.lastIndexOf("."));

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        // One grid item for question and follow-up, so the follow-up isn't a full row gap away.
        <div className="flex flex-col gap-4" style={{ gridColumn: `span ${fieldConfig.width}` }}>
          <Field data-invalid={fieldState.invalid}>
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
          {fieldConfig.followUp && hasValue(field.value, fieldConfig.followUp.triggerValue) && (
            <FollowUpField
              control={control}
              name={`${parentPath}.${fieldConfig.followUp.storageKey}`}
              followUp={fieldConfig.followUp}
            />
          )}
        </div>
      )}
    />
  );
}
