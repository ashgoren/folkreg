"use client";

import type { UseFormReturn } from "react-hook-form";
import { FieldGroup } from "@/components/ui/field";
import { NumberField } from "@/components/form-number-field";
import type { AdmissionsConfig } from "@repo/tenant-config";

export function FixedFields({ form }: { form: UseFormReturn<AdmissionsConfig> }) {
  return (
    <FieldGroup>
      <NumberField control={form.control} name="cost" id="admissions-fixed-cost" label="Cost" required />
    </FieldGroup>
  );
}
