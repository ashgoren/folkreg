import { Controller } from "react-hook-form";
import { FIELD_DEFS, hasValue } from "@repo/fields";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FollowUpField } from "./follow-up-field";
import type { FieldProps } from "./types";

export function RadioField({ control, name, entry, isRegistrant }: FieldProps) {
  const def = FIELD_DEFS[entry.name];
  const options = entry.options ?? [];
  // The registrant's own age (etc.) can be limited to a subset of the tenant's options; everyone
  // else may choose any of them.
  const allowedValues = isRegistrant && def.canLimitFirstPerson && entry.firstPersonOptions ? entry.firstPersonOptions : null;
  const parentPath = name.slice(0, name.lastIndexOf("."));

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <>
          <Field data-invalid={fieldState.invalid}>
            <FormLabel required={entry.required}>{entry.label}</FormLabel>
            {entry.title && <FieldDescription>{entry.title}</FieldDescription>}
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
          {def.followUp && hasValue(field.value, def.followUp.triggerValue) && (
            <FollowUpField control={control} name={`${parentPath}.${def.followUp.storageKey}`} followUp={def.followUp} />
          )}
        </>
      )}
    />
  );
}
