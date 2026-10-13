import { Controller } from "react-hook-form";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FieldProps } from "./types";

// Any autocomplete-type field: a fixed list of suggestions (fieldConfig.suggestions),
// not a typed-search widget, and not google places address autocomplete.
// State is the only field using this at the moment.
export function AutocompleteField({ control, name, fieldConfig }: FieldProps) {
  const suggestions = fieldConfig.suggestions ?? [];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} style={{ gridColumn: `span ${fieldConfig.width}` }}>
          <FormLabel htmlFor={name} required={fieldConfig.required}>{fieldConfig.label}</FormLabel>
          {fieldConfig.title && <FieldDescription>{fieldConfig.title}</FieldDescription>}
          <Select value={typeof field.value === "string" ? field.value : ""} onValueChange={field.onChange}>
            <SelectTrigger id={name} onBlur={field.onBlur} aria-invalid={fieldState.invalid}>
              <SelectValue placeholder={fieldConfig.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {suggestions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
