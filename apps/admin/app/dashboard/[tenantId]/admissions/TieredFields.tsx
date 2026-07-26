"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import type { AdmissionsValues } from "./schema";
import { TieredCategories } from "./TieredCategories";

export function TieredFields({ form }: { form: UseFormReturn<AdmissionsValues> }) {
  return (
    <div className="space-y-6">
      <FieldGroup>
        <Controller name="earlybirdCutoff" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="admissions-earlybird-cutoff" required>Early-bird cutoff</FormLabel>
            <FieldDescription>Last day early pricing applies, e.g. 2025-11-10</FieldDescription>
            <Input {...field} id="admissions-earlybird-cutoff" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />
      </FieldGroup>

      <TieredCategories form={form} />
    </div>
  );
}
