"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Field, FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AdmissionsConfig } from "@repo/tenant-config";

type When = AdmissionsConfig["waitlist"]["when"];

/**
 * When new registrants join the waitlist instead of paying: never, after a number of people, or
 * now. The number sits in its own option's label ("After [100] people"), always shown and kept
 * whichever option is chosen, so switching back restores it -- and an error in it is never hidden.
 */
export function WaitlistFields({ form }: { form: UseFormReturn<AdmissionsConfig> }) {
  return (
    <FieldSet>
      <FieldLegend variant="label">Waitlist</FieldLegend>
      <Controller
        name="waitlist.when"
        control={form.control}
        render={({ field }) => (
          <RadioGroup value={field.value} onValueChange={(value) => field.onChange(value as When)}>
            <Field orientation="horizontal">
              <RadioGroupItem value="never" id="admissions-waitlist-never" />
              <FormLabel htmlFor="admissions-waitlist-never">Never</FormLabel>
            </Field>
            <Field orientation="horizontal" className="items-start">
              <RadioGroupItem value="when-full" id="admissions-waitlist-when-full" aria-label="After a number of people" className="mt-2" />
              <CapacityInput form={form} />
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="now" id="admissions-waitlist-now" />
              <FormLabel htmlFor="admissions-waitlist-now">Now</FormLabel>
            </Field>
          </RadioGroup>
        )}
      />
    </FieldSet>
  );
}

// "After [100] people". Like NumberField, a cleared input is NaN, so it shows an error rather than
// being saved as 0.
function CapacityInput({ form }: { form: UseFormReturn<AdmissionsConfig> }) {
  return (
    <Controller
      name="waitlist.capacity"
      control={form.control}
      render={({ field, fieldState }) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm">
            <FormLabel htmlFor="admissions-waitlist-when-full">After</FormLabel>
            <Input
              id="admissions-waitlist-capacity"
              type="number"
              aria-label="Number of people"
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
