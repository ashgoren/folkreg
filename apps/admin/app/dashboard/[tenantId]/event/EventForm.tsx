"use client";

import { Controller } from "react-hook-form";
import { Field, FieldContent, FieldDescription, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { DateField } from "@/components/form-date-field";
import { Switch } from "@/components/ui/switch";
import { AutosaveStatus } from "@/components/autosave-status";
import { SelectField } from "@/components/form-select-field";
import { TextField } from "@/components/form-text-field";
import { Separator } from "@/components/ui/separator";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import type { Tenant } from "@repo/types";
import { eventConfigSchema, TIMEZONES } from "@repo/tenant-config";
import { updateEvent } from "./actions";

export function EventForm({ tenant }: { tenant: Tenant }) {
  const { form, formProps, isPending, savedRecently } = useAutosaveForm({
    label: "Event",
    schema: eventConfigSchema,
    defaultValues: tenant.event_config,
    save: (data) => updateEvent(tenant.id, data),
  });

  return (
    <form {...formProps} className="space-y-8">

      <FieldGroup>
        <TextField control={form.control} name="title" id="event-title" label="Title" description="Event name" autoComplete="off" required />

        <TextField control={form.control} name="location" id="event-location" label="Location" description="Display string shown to registrants, e.g. Example Hall, Portland, OR" autoComplete="off" required />

        {/* The event's own clock times; Timezone below says which clock. */}
        <div className="flex flex-wrap gap-4">
          <DateField control={form.control} name="start" id="event-start" label="Starts" withTime />
          <DateField control={form.control} name="end" id="event-end" label="Ends" withTime />
        </div>

        <SelectField
          control={form.control}
          name="timezone"
          id="event-timezone"
          label="Timezone"
          options={TIMEZONES}
          required
        />

        <TextField
          control={form.control}
          name="date"
          id="event-date"
          label="Date shown to registrants"
          description="Optional override; leave blank to derive from above."
          autoComplete="off"
        />
      </FieldGroup>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-base font-medium">Add to calendar</h2>
        <FieldGroup>
          <Controller
            name="calendar.show"
            control={form.control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FormLabel htmlFor="event-cal-show">Show &ldquo;Add to calendar&rdquo; links</FormLabel>
                  <FieldDescription>Registrants can add the event, with its start and end, to their calendar.</FieldDescription>
                </FieldContent>
                <Switch id="event-cal-show" checked={field.value} onCheckedChange={field.onChange} />
              </Field>
            )}
          />

          <TextField control={form.control} name="calendar.description" id="event-cal-description" label="Description" autoComplete="off" />

          <TextField
            control={form.control}
            name="calendar.location"
            id="event-cal-location"
            label="Location for maps"
            description="Optional. A street address maps apps can find, e.g. 123 Main St, Portland, OR 97201. Leave blank to use the location above."
            autoComplete="off"
          />
        </FieldGroup>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-base font-medium">Contacts</h2>
        <FieldGroup>
          <TextField control={form.control} name="contacts.info" id="event-contact-info" label="Info email" type="email" autoComplete="off" required />

          <TextField control={form.control} name="contacts.housing" id="event-contact-housing" label="Housing email" type="email" autoComplete="off" />
        </FieldGroup>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-base font-medium">Links</h2>
        <FieldGroup>
          <TextField control={form.control} name="links.info" id="event-link-info" label="More info URL" type="url" autoComplete="off" />

          <TextField control={form.control} name="links.health" id="event-link-health" label="Health policy URL" type="url" autoComplete="off" />

          <TextField control={form.control} name="links.safety" id="event-link-safety" label="Safety policy URL" type="url" autoComplete="off" />
        </FieldGroup>
      </div>

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
