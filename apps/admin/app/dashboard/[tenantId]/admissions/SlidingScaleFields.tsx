"use client";

import type { UseFormReturn } from "react-hook-form";
import { FieldGroup } from "@/components/ui/field";
import { NumberField } from "@/components/form-number-field";
import type { AdmissionsValues } from "./schema";

export function SlidingScaleFields({ form }: { form: UseFormReturn<AdmissionsValues> }) {
  return (
    <FieldGroup>
      <NumberField control={form.control} name="costRange.0" id="admissions-cost-min" label="Minimum" required />
      <NumberField control={form.control} name="costRange.1" id="admissions-cost-max" label="Maximum" required />
      <NumberField control={form.control} name="costDefault" id="admissions-cost-default" label="Default" required />
    </FieldGroup>
  );
}
