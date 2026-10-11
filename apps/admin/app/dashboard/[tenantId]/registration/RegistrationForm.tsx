"use client";

import { useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Field, FieldContent, FieldDescription, FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { DateField, DateInput } from "@/components/form-date-field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AutosaveStatus } from "@/components/autosave-status";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import type { Tenant } from "@repo/types";
import { formatDateTime, registrationConfigSchema, type RegistrationConfig } from "@repo/tenant-config";
import { updateRegistration } from "./actions";
import { ClosingTime } from "./ClosingTime";
import { PeopleLimit } from "./PeopleLimit";
import { RegistrationSummary } from "./RegistrationSummary";

type Opening = RegistrationConfig["opening"];

// Whether choosing `to` over `from` could make the site public sooner, which is what asks first:
// opening now from anything else, or scheduling from closed. Scheduling from open now, or closing,
// only narrows when registrations are taken.
const opensSooner = (from: Opening, to: Opening) => (to === "now" ? from !== "now" : to === "scheduled" && from === "closed");

/**
 * When the registration form takes submissions, what a submission becomes, and whether registrants
 * see the preregistration page first. Every setting is always shown, whichever mode is chosen and whether or not a limit is on, so a hidden value can
 * never hold an error that blocks saving.
 */
export function RegistrationForm({ tenant, now }: { tenant: Tenant; now: number }) {
  const { form, formProps, isPending, savedRecently } = useAutosaveForm({
    label: "Registration",
    schema: registrationConfigSchema,
    defaultValues: tenant.registration_config,
    save: (data) => updateRegistration(tenant.id, data),
  });
  const { timezone } = tenant.event_config;
  // The opening choice waiting on the confirmation, while it's showing.
  const [pendingOpening, setPendingOpening] = useState<Opening | null>(null);

  // With both limits on, a waitlist limit at or above the closing one is never reached. Allowed,
  // since it isn't contradictory data, but almost certainly not what was meant.
  const [mode, closeAfter, waitlistAfter, opensAt] = useWatch({ control: form.control, name: ["mode", "closeAfter", "waitlistAfter", "opensAt"] });
  const waitlistUnreachable = mode === "pay" && closeAfter.enabled && waitlistAfter.enabled && waitlistAfter.people >= closeAfter.people;

  // A scheduled opening's confirmation names its time, once there's a valid one to name.
  const opensAtValid = opensAt !== "" && registrationConfigSchema.shape.opensAt.safeParse(opensAt).success;
  const startingAt = pendingOpening !== "scheduled" ? ""
    : opensAtValid ? ` starting ${formatDateTime(opensAt, timezone)}`
    : " starting at the opening time you set";

  return (
    <form {...formProps} className="space-y-8">
      <RegistrationSummary control={form.control} timezone={timezone} now={now} />

      <div className="space-y-4">
        <h2 className="text-base font-medium">When registration is open</h2>
        <Controller
          name="opening"
          control={form.control}
          render={({ field }) => (
            <FieldSet>
              <FieldLegend variant="label">Opens</FieldLegend>
              <RadioGroup
                value={field.value}
                onValueChange={(value) => {
                  const choice = value as Opening;
                  if (opensSooner(field.value, choice)) setPendingOpening(choice);
                  else field.onChange(choice);
                }}
                className="gap-3"
              >
                <Field orientation="horizontal">
                  <RadioGroupItem value="closed" id="registration-opening-closed" />
                  <FormLabel htmlFor="registration-opening-closed">Closed</FormLabel>
                </Field>
                <Field orientation="horizontal">
                  <RadioGroupItem value="now" id="registration-opening-now" />
                  <FormLabel htmlFor="registration-opening-now">Open now</FormLabel>
                </Field>
                {/* Times on the event's clock (Event page's timezone). */}
                <Controller
                  name="opensAt"
                  control={form.control}
                  render={({ field: opensAtField, fieldState }) => (
                    <div className="flex flex-col gap-1">
                      <Field orientation="horizontal">
                        <RadioGroupItem value="scheduled" id="registration-opening-scheduled" />
                        <FormLabel htmlFor="registration-opening-scheduled">Opens on</FormLabel>
                        <DateInput field={opensAtField} id="registration-opens-at" aria-label="Opening time" invalid={fieldState.invalid} withTime />
                      </Field>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </div>
                  )}
                />
              </RadioGroup>
            </FieldSet>
          )}
        />

        <FieldSet>
          <FieldLegend variant="label">Closes</FieldLegend>
          <ClosingTime form={form} />
          <Field>
            <PeopleLimit form={form} name="closeAfter" id="registration-close-after" label="Close after" />
            <FieldDescription>Counts everyone registered, including the waitlist and lottery entries.</FieldDescription>
          </Field>
        </FieldSet>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-base font-medium">Registrants</h2>
        <Controller
          name="mode"
          control={form.control}
          render={({ field }) => (
            <RadioGroup value={field.value} onValueChange={(value) => field.onChange(value as RegistrationConfig["mode"])} className="gap-4">
              <div className="space-y-2">
                <Field orientation="horizontal">
                  <RadioGroupItem value="pay" id="registration-mode-pay" />
                  <FormLabel htmlFor="registration-mode-pay">Pay right away</FormLabel>
                </Field>
                <div className="pl-6">
                  <PeopleLimit form={form} name="waitlistAfter" id="registration-waitlist-after" label="Waitlist new registrants after" />
                </div>
              </div>

              <div className="space-y-2">
                <Field orientation="horizontal">
                  <RadioGroupItem value="lottery" id="registration-mode-lottery" />
                  <FormLabel htmlFor="registration-mode-lottery">Enter the lottery</FormLabel>
                </Field>
                <div className="pl-6">
                  <DateField
                    control={form.control}
                    name="lotteryResultsDate"
                    id="registration-lottery-results"
                    label="Results by"
                    description="Shown in the lottery receipt; blank leaves it out."
                  />
                </div>
              </div>

              <Field orientation="horizontal">
                <RadioGroupItem value="waitlist" id="registration-mode-waitlist" />
                <FormLabel htmlFor="registration-mode-waitlist">Join the waitlist</FormLabel>
              </Field>
            </RadioGroup>
          )}
        />
        {waitlistUnreachable && (
          <p className="text-sm text-amber-700 dark:text-amber-500">
            Registration closes after {closeAfter.people} people, before anyone reaches the waitlist at {waitlistAfter.people}.
          </p>
        )}
      </div>

      <Separator />

      <Controller
        name="showPreregistration"
        control={form.control}
        render={({ field }) => (
          <Field orientation="horizontal">
            <FieldContent>
              <FormLabel htmlFor="registration-preregistration">Show preregistration?</FormLabel>
              <FieldDescription>When on, registrants check a box acknowledging policies before the form.</FieldDescription>
            </FieldContent>
            <Switch id="registration-preregistration" checked={field.value} onCheckedChange={field.onChange} />
          </Field>
        )}
      />

      <AlertDialog open={pendingOpening !== null} onOpenChange={(open) => { if (!open) setPendingOpening(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Open registration?</AlertDialogTitle>
            <AlertDialogDescription>{tenant.slug}.folkreg.org will take registrations from the public{startingAt}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => pendingOpening && form.setValue("opening", pendingOpening)}>Open registration</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
