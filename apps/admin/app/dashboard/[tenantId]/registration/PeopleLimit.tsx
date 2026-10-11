"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import type { RegistrationConfig } from "@repo/tenant-config";

/**
 * An optional limit on the number of people, written as a sentence: "[✓] Close after [400] people".
 * The number is always shown, whether or not the limit is on, so its error can never be hidden and
 * turning the limit on or off needs no check first. Like NumberField, a cleared number is NaN, so
 * it shows an error rather than being saved as 0.
 */
export function PeopleLimit({ form, name, id, label }: {
  form: UseFormReturn<RegistrationConfig>;
  name: "closeAfter" | "waitlistAfter";
  id: string;
  /** The words before the number, e.g. "Close after". */
  label: string;
}) {
  return (
    <Controller
      name={`${name}.people`}
      control={form.control}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm">
            <Controller
              name={`${name}.enabled`}
              control={form.control}
              render={({ field: enabled }) => (
                <Checkbox id={id} checked={enabled.value} onCheckedChange={(checked) => enabled.onChange(checked === true)} />
              )}
            />
            <FormLabel htmlFor={id}>{label}</FormLabel>
            <Input
              id={`${id}-people`}
              type="number"
              aria-label={`${label}: number of people`}
              aria-invalid={fieldState.invalid}
              className="h-8 w-20"
              value={Number.isNaN(field.value) ? "" : field.value}
              onChange={(e) => field.onChange(e.target.value === "" ? NaN : Number(e.target.value))}
              onBlur={field.onBlur}
            />
            <span>people</span>
          </div>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </div>
      )}
    />
  );
}
