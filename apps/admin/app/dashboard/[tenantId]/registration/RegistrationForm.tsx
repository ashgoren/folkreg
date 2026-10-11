"use client";

import { Controller, useWatch } from "react-hook-form";
import { Field, FieldContent, FieldDescription, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { DateField } from "@/components/form-date-field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AutosaveStatus } from "@/components/autosave-status";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import type { Tenant } from "@repo/types";
import { registrationConfigSchema, type RegistrationConfig } from "@repo/tenant-config";
import { updateRegistration } from "./actions";
import { PeopleLimit } from "./PeopleLimit";
import { RegistrationSummary } from "./RegistrationSummary";

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

  // With both limits on, a waitlist limit at or above the closing one is never reached. Allowed,
  // since it isn't contradictory data, but almost certainly not what was meant.
  const [mode, closeAfter, waitlistAfter] = useWatch({ control: form.control, name: ["mode", "closeAfter", "waitlistAfter"] });
  const waitlistUnreachable = mode === "pay" && closeAfter.enabled && waitlistAfter.enabled && waitlistAfter.people >= closeAfter.people;

  return (
    <form {...formProps} className="space-y-8">
      <RegistrationSummary control={form.control} timezone={timezone} now={now} />

      <div className="space-y-4">
        <h2 className="text-base font-medium">When registration is open</h2>
        <FieldGroup>
          <Controller
            name="open"
            control={form.control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FormLabel htmlFor="registration-open">Open</FormLabel>
                  <FieldDescription>Turn off to close registration, whatever the times and limit below say.</FieldDescription>
                </FieldContent>
                <Switch id="registration-open" checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />

          {/* Times on the event's clock (Event page's timezone). */}
          <div className="flex flex-wrap gap-4">
            <DateField
              control={form.control}
              name="opensAt"
              id="registration-opens-at"
              label="Opens"
              description="Blank: as soon as it's turned on."
              withTime
            />
            <DateField
              control={form.control}
              name="closesAt"
              id="registration-closes-at"
              label="Closes"
              description="Blank: until it's turned off."
              withTime
            />
          </div>

          <Field>
            <PeopleLimit form={form} name="closeAfter" id="registration-close-after" label="Close after" />
            <FieldDescription>Counts everyone registered, including the waitlist and lottery entries.</FieldDescription>
          </Field>
        </FieldGroup>
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

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
