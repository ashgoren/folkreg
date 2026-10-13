import { Controller } from "react-hook-form";
import { toggleOption } from "@repo/fields";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Checkbox } from "@/components/ui/checkbox";
import type { FieldProps } from "./types";

export function CheckboxGroupField({ control, name, fieldConfig }: FieldProps) {
  const options = fieldConfig.options ?? [];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selected: string[] = Array.isArray(field.value) ? field.value : [];
        return (
          <>
            <Field data-invalid={fieldState.invalid} style={{ gridColumn: `span ${fieldConfig.width}` }}>
              <FormLabel required={fieldConfig.required}>{fieldConfig.label}</FormLabel>
              {fieldConfig.title && <FieldDescription>{fieldConfig.title}</FieldDescription>}
              {options.map((option) => (
                <label key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    checked={selected.includes(option.value)}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        toggleOption({
                          prerequisiteOption: fieldConfig.prerequisiteOption,
                          selected,
                          value: option.value,
                          checked: checked === true
                        })
                      )
                    }
                    onBlur={field.onBlur}
                    aria-invalid={fieldState.invalid}
                  />
                  {option.label}
                </label>
              ))}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          </>
        );
      }}
    />
  );
}
