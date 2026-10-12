import { Controller } from "react-hook-form";
import { FIELD_DEFS, hasValue, toggleOption } from "@repo/fields";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Checkbox } from "@/components/ui/checkbox";
import { FollowUpField } from "./follow-up-field";
import type { FieldProps } from "./types";

export function CheckboxGroupField({ control, name, entry }: FieldProps) {
  const def = FIELD_DEFS[entry.name];
  const options = entry.options ?? [];
  const parentPath = name.slice(0, name.lastIndexOf("."));

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selected: string[] = Array.isArray(field.value) ? field.value : [];
        return (
          <>
            <Field data-invalid={fieldState.invalid}>
              <FormLabel required={entry.required}>{entry.label}</FormLabel>
              {entry.title && <FieldDescription>{entry.title}</FieldDescription>}
              {options.map((option) => (
                <label key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={selected.includes(option.value)}
                    onCheckedChange={(checked) => field.onChange(toggleOption(def, selected, option.value, checked === true))}
                    onBlur={field.onBlur}
                    aria-invalid={fieldState.invalid}
                  />
                  {option.label}
                </label>
              ))}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
            {def.followUp && hasValue(selected, def.followUp.triggerValue) && (
              <FollowUpField control={control} name={`${parentPath}.${def.followUp.storageKey}`} followUp={def.followUp} />
            )}
          </>
        );
      }}
    />
  );
}
