"use client";

import { Controller, useWatch } from "react-hook-form";
import { AutosaveStatus } from "@/components/autosave-status";
import { Field, FieldContent, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { NumberField } from "@/components/form-number-field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import type { Tenant } from "@repo/types";
import { admissionsConfigSchema, type AdmissionsConfig } from "@repo/tenant-config";
import { updateAdmissions } from "./actions";
import { SlidingScaleFields } from "./SlidingScaleFields";
import { FixedFields } from "./FixedFields";
import { TieredFields } from "./TieredFields";
import { WaitlistFields } from "./WaitlistFields";

export function AdmissionsForm({ tenant }: { tenant: Tenant }) {
  // The tenant's age brackets: its age field's options, edited on the Fields page (an option still
  // being written, with no value yet, isn't one). null when the age field isn't active.
  const ageField = tenant.fields_config.misc.find((field) => field.name === "age");
  const ageOptions = ageField ? (ageField.options ?? []).filter((option) => option.value !== "") : null;

  const { form, formProps, isPending, savedRecently } = useAutosaveForm({
    label: "Admissions",
    schema: admissionsConfigSchema,
    defaultValues: tenant.admissions_config,
    save: (data) => updateAdmissions(tenant.id, data),
  });

  const mode = useWatch({ control: form.control, name: "mode" });

  // Switching only changes `mode`: every mode's values stay in the form and are saved, so an
  // accidental switch loses nothing. It waits until the current values are valid, since once a
  // mode's fields are hidden, an error left in one would block every later save with nothing on
  // screen to explain why -- whereas here the error is still showing next to the field.
  async function handleModeChange(newMode: AdmissionsConfig["mode"]) {
    if (await form.trigger()) form.setValue("mode", newMode);
  }

  return (
    <form {...formProps} className="space-y-8">
      <FieldGroup>
        <Controller name="mode" control={form.control} render={({ field }) => (
          <RadioGroup value={field.value} onValueChange={(value) => handleModeChange(value as AdmissionsConfig["mode"])}>
            <Field orientation="horizontal">
              <RadioGroupItem value="fixed" id="admissions-mode-fixed" />
              <FieldContent>
                <FormLabel htmlFor="admissions-mode-fixed">Fixed</FormLabel>
              </FieldContent>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="sliding-scale" id="admissions-mode-sliding-scale" />
              <FieldContent>
                <FormLabel htmlFor="admissions-mode-sliding-scale">Sliding scale</FormLabel>
              </FieldContent>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="tiered" id="admissions-mode-tiered" />
              <FieldContent>
                <FormLabel htmlFor="admissions-mode-tiered">Tiered</FormLabel>
              </FieldContent>
            </Field>
          </RadioGroup>
        )} />
      </FieldGroup>

      <Separator />

      {mode === "sliding-scale" && <SlidingScaleFields form={form} />}
      {mode === "fixed" && <FixedFields form={form} />}
      {mode === "tiered" && <TieredFields form={form} ageOptions={ageOptions} />}

      <Separator />

      <FieldGroup>
        <NumberField
          control={form.control}
          name="admissionQuantityMax"
          id="admissions-quantity-max"
          label="Max number of tickets registrant can purchase"
          description="Registrants can purchase up to this many tickets in a single checkout"
          required
        />

        <WaitlistFields form={form} />
      </FieldGroup>

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
