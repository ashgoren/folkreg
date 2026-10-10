"use client";

import type { UseFormReturn } from "react-hook-form";
import { FieldGroup } from "@/components/ui/field";
import { NumberField } from "@/components/form-number-field";
import type { AdmissionsConfig } from "@repo/tenant-config";

export function SlidingScaleFields({ form }: { form: UseFormReturn<AdmissionsConfig> }) {
  return (
    <FieldGroup>
      <NumberField control={form.control} name="slidingScale.min" id="admissions-sliding-min" label="Minimum" required />
      <NumberField control={form.control} name="slidingScale.max" id="admissions-sliding-max" label="Maximum" required />
      <NumberField control={form.control} name="slidingScale.default" id="admissions-sliding-default" label="Default" required />
    </FieldGroup>
  );
}
