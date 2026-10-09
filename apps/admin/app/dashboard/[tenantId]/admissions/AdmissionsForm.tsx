"use client";

import { Controller, useWatch } from "react-hook-form";
import { AutosaveStatus } from "@/components/autosave-status";
import { Field, FieldContent, FieldDescription, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { NumberField } from "@/components/form-number-field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import type { Tenant } from "@repo/types";
import { admissionsConfigSchema, type AdmissionsConfig } from "@repo/tenant-config";
import { updateAdmissions } from "./actions";
import { SlidingScaleFields } from "./SlidingScaleFields";
import { FixedFields } from "./FixedFields";
import { TieredFields } from "./TieredFields";

export function AdmissionsForm({ tenant }: { tenant: Tenant }) {
  const { form, isPending, savedRecently } = useAutosaveForm({
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
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
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
      {mode === "tiered" && <TieredFields form={form} />}

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

        <NumberField
          control={form.control}
          name="waitlistCutoff"
          id="admissions-waitlist-cutoff"
          label="Total number of tickets for sale (before waitlist)"
          description="Registrations beyond this number go to the waitlist"
          required
        />

        <Controller
          name="forceWaitlist"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FormLabel htmlFor="admissions-force-waitlist">Force waitlist mode?</FormLabel>
                <FieldDescription>
                  When on, all new registrations go straight to the waitlist, bypassing the cutoff above
                </FieldDescription>
              </FieldContent>
              <Switch
                id="admissions-force-waitlist"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
            </Field>
          )}
        />
      </FieldGroup>

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
