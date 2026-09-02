"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AutosaveStatus } from "@/components/autosave-status";
import { Field, FieldContent, FieldDescription, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { NumberField } from "@/components/form-number-field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAutosave } from "@/lib/useAutosave";
import type { Tenant } from "@repo/types";
import { admissionsSchema, type AdmissionsValues } from "./schema";
import { updateAdmissions } from "./actions";
import { SlidingScaleFields } from "./SlidingScaleFields";
import { FixedFields } from "./FixedFields";
import { TieredFields } from "./TieredFields";

function getDefaultsForMode(
  mode: AdmissionsValues["mode"],
  shared: { admissionQuantityMax: number; waitlistCutoff: number; forceWaitlist: boolean },
): AdmissionsValues {
  switch (mode) {
    case "fixed":
      return { mode, cost: 60, ...shared };
    case "sliding-scale":
      return { mode, costRange: [20, 100], costDefault: 60, ...shared };
    case "tiered":
      return { mode, earlybirdCutoff: "", categories: [], ...shared };
  }
}

export function AdmissionsForm({ tenant }: { tenant: Tenant }) {
  const admissionsConfig = tenant.admissions_config;
  const initialShared = {
    admissionQuantityMax: admissionsConfig?.admissionQuantityMax ?? 4,
    waitlistCutoff: admissionsConfig?.waitlistCutoff ?? 999,
    forceWaitlist: admissionsConfig?.forceWaitlist ?? false,
  };
  const initialValues: AdmissionsValues = admissionsConfig
    ? { ...admissionsConfig, ...initialShared }
    : getDefaultsForMode("sliding-scale", initialShared);

  const form = useForm<AdmissionsValues>({
    mode: "onBlur",
    resolver: zodResolver(admissionsSchema),
    defaultValues: initialValues,
  });

  const { saveDebounced, isPending, savedRecently } = useAutosave<AdmissionsValues>(
    (data) => updateAdmissions(tenant.id, data),
  );

  useEffect(() => {
    const subscription = form.watch((values) => {
      const parsed = admissionsSchema.safeParse(values);
      if (!parsed.success) return;
      saveDebounced(parsed.data);
    });
    return () => subscription.unsubscribe();
  }, [form, saveDebounced]);

  const mode = form.watch("mode");

  const modeCache = useRef<Partial<Record<AdmissionsValues["mode"], AdmissionsValues>>>({});

  function handleModeChange(newMode: AdmissionsValues["mode"]) {
    const current = form.getValues();
    modeCache.current[current.mode] = current;

    const shared = {
      admissionQuantityMax: current.admissionQuantityMax,
      waitlistCutoff: current.waitlistCutoff,
      forceWaitlist: current.forceWaitlist,
    };
    const cached = modeCache.current[newMode];
    form.reset(cached ? { ...cached, ...shared } : getDefaultsForMode(newMode, shared));
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
      <FieldGroup>
        <Controller name="mode" control={form.control} render={({ field }) => (
          <RadioGroup value={field.value} onValueChange={(value) => handleModeChange(value as AdmissionsValues["mode"])}>
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
