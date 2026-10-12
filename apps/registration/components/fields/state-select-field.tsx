import { Controller } from "react-hook-form";
import { FIELD_DEFS } from "@repo/fields";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FieldProps } from "./types";

// The one "autocomplete" field (state): a fixed, catalog-provided list of suggestions, not a
// typed-search widget -- distinct from Google Places, which is an address-specific, API-backed
// enhancement layered onto the plain text address field instead.
export function StateSelectField({ control, name, entry }: FieldProps) {
  const def = FIELD_DEFS[entry.name];
  const suggestions = def.suggestions ?? [];

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} style={entry.width ? { gridColumn: `span ${entry.width}` } : undefined}>
          <FormLabel htmlFor={name} required={entry.required}>{entry.label}</FormLabel>
          {entry.title && <FieldDescription>{entry.title}</FieldDescription>}
          <Select value={typeof field.value === "string" ? field.value : ""} onValueChange={field.onChange}>
            <SelectTrigger id={name} onBlur={field.onBlur} aria-invalid={fieldState.invalid}>
              <SelectValue placeholder={entry.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {suggestions.map((state) => (
                <SelectItem key={state.id} value={state.abbreviation}>{state.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
