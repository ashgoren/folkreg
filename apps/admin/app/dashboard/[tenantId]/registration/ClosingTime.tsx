"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { DateInput } from "@/components/form-date-field";
import type { RegistrationConfig } from "@repo/tenant-config";

/**
 * An optional closing time, written as a sentence like PeopleLimit: "[✓] Close at [date and time]".
 * The time is always shown, whether or not it's on, so its error can never be hidden. Unchecking it
 * is how it's turned off, so it has no Clear button: the time stays for when it's checked again.
 */
export function ClosingTime({ form }: { form: UseFormReturn<RegistrationConfig> }) {
  return (
    <Controller
      name="closeAt.at"
      control={form.control}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm">
            <Controller
              name="closeAt.enabled"
              control={form.control}
              render={({ field: enabled }) => (
                <Checkbox id="registration-close-at" checked={enabled.value} onCheckedChange={(checked) => enabled.onChange(checked === true)} />
              )}
            />
            <FormLabel htmlFor="registration-close-at">Close at</FormLabel>
            <DateInput field={field} id="registration-close-at-time" aria-label="Closing time" invalid={fieldState.invalid} withTime />
          </div>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </div>
      )}
    />
  );
}
