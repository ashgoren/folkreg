"use client";

import type { UseFormReturn } from "react-hook-form";
import { FieldGroup } from "@/components/ui/field";
import { NumberField } from "@/components/form-number-field";
import type { AdmissionsValues } from "./schema";

export function FixedFields({ form }: { form: UseFormReturn<AdmissionsValues> }) {
  return (
    <FieldGroup>
      <NumberField control={form.control} name="cost" id="admissions-fixed-cost" label="Cost" required />
    </FieldGroup>
  );
}
