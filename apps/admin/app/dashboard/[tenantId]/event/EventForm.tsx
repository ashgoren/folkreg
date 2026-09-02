"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldGroup } from "@/components/ui/field";
import { AutosaveStatus } from "@/components/autosave-status";
import { NumberField } from "@/components/form-number-field";
import { TextField } from "@/components/form-text-field";
import { Separator } from "@/components/ui/separator";
import { useAutosave } from "@/lib/useAutosave";
import type { Tenant } from "@repo/types";
import { eventSchema, type EventValues } from "./schema";
import { updateEvent } from "./actions";

export function EventForm({ tenant }: { tenant: Tenant }) {
  const eventConfig = tenant.event_config;

  const form = useForm<EventValues>({
    mode: "onBlur",
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: eventConfig?.title ?? "",
      year: eventConfig?.year ?? new Date().getFullYear(),
      location: eventConfig?.location ?? "",
      date: eventConfig?.date ?? "",
      timezone: eventConfig?.timezone ?? "America/Los_Angeles",
      calendar: {
        title: eventConfig?.calendar?.title ?? "",
        description: eventConfig?.calendar?.description ?? "",
        location: eventConfig?.calendar?.location ?? "",
        start: eventConfig?.calendar?.start ?? "",
        end: eventConfig?.calendar?.end ?? "",
      },
      contacts: {
        info: eventConfig?.contacts?.info ?? "",
        housing: eventConfig?.contacts?.housing ?? "",
      },
      links: {
        info: eventConfig?.links?.info ?? "",
        health: eventConfig?.links?.health ?? "",
        safety: eventConfig?.links?.safety ?? "",
      },
    },
  });

  const { saveDebounced, isPending, savedRecently } = useAutosave<EventValues>(
    (data) => updateEvent(tenant.id, data),
  );

  useEffect(() => {
    const subscription = form.watch((values) => {
      const parsed = eventSchema.safeParse(values);
      if (!parsed.success) return;
      saveDebounced(parsed.data);
    });
    return () => subscription.unsubscribe();
  }, [form, saveDebounced]);

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">

      <FieldGroup>
        <TextField control={form.control} name="title" id="event-title" label="Title" description="Event name" autoComplete="off" required />

        <NumberField control={form.control} name="year" id="event-year" label="Year" required />

        <TextField control={form.control} name="location" id="event-location" label="Location" description="Display string shown to registrants, e.g. Example Hall, Portland, OR" autoComplete="off" required />

        <TextField control={form.control} name="date" id="event-date" label="Date" description="Display string shown to registrants, e.g. October 3-5, 2025" autoComplete="off" required />

        <TextField control={form.control} name="timezone" id="event-timezone" label="Timezone" description="IANA timezone" autoComplete="off" required />
      </FieldGroup>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-base font-medium">Google Calendar Event (optional)</h2>
        <FieldGroup>
          <TextField control={form.control} name="calendar.title" id="event-cal-title" label="Title" autoComplete="off" />

          <TextField control={form.control} name="calendar.description" id="event-cal-description" label="Description" autoComplete="off" />

          <TextField control={form.control} name="calendar.location" id="event-cal-location" label="Location" autoComplete="off" />

          <TextField control={form.control} name="calendar.start" id="event-cal-start" label="Start" description="ISO 8601 with offset, e.g. 2025-10-03T19:00:00-07:00" autoComplete="off" />

          <TextField control={form.control} name="calendar.end" id="event-cal-end" label="End" description="ISO 8601 with offset, e.g. 2025-10-05T15:00:00-07:00" autoComplete="off" />
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
          <TextField control={form.control} name="links.info" id="event-link-info" label="More info URL" type="url" autoComplete="url" />

          <TextField control={form.control} name="links.health" id="event-link-health" label="Health policy URL" type="url" autoComplete="url" />

          <TextField control={form.control} name="links.safety" id="event-link-safety" label="Safety policy URL" type="url" autoComplete="url" />
        </FieldGroup>
      </div>

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
