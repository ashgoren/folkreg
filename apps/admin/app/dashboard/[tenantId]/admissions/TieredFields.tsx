"use client";

import { type UseFormReturn } from "react-hook-form";
import { FieldGroup } from "@/components/ui/field";
import { DateField } from "@/components/form-date-field";
import { NumberField } from "@/components/form-number-field";
import type { AdmissionsConfig } from "@repo/tenant-config";
import { TieredPrices, type AgeOption } from "./TieredPrices";

export function TieredFields({ form, ageOptions }: { form: UseFormReturn<AdmissionsConfig>; ageOptions: AgeOption[] | null }) {
  return (
    <div className="space-y-6">
      <FieldGroup>
        <DateField
          control={form.control}
          name="earlybirdCutoff"
          id="admissions-earlybird-cutoff"
          label="Early-bird cutoff"
          description="The last day early-bird prices apply, in the event's timezone. Leave blank for no early-bird pricing: prices stay as entered."
        />
        <NumberField
          control={form.control}
          name="lateIncrease"
          id="admissions-late-increase"
          label="Increase after the cutoff"
          description="Every price goes up by this much after the early-bird cutoff. Free stays free."
        />
      </FieldGroup>

      <TieredPrices form={form} ageOptions={ageOptions} />
    </div>
  );
}
