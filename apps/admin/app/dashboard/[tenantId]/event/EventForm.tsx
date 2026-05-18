"use client";

import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { Tenant } from "@repo/types";
import { eventSchema, type EventValues } from "./schema";
import { updateEvent } from "./actions";

export function EventForm({ tenant, tenantId }: { tenant: Tenant; tenantId: string }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const eventConfig = tenant.event_config;

  const form = useForm<EventValues>({
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
      nametags: {
        includePronouns: eventConfig?.nametags?.includePronouns ?? false,
        includeLastName: eventConfig?.nametags?.includeLastName ?? false,
      },
    },
  });

  const isDirty = form.formState.isDirty;
  useEffect(() => { if (isDirty) setSaved(false) }, [isDirty]);

  function onSubmit(values: EventValues) {
    setSaved(false);
    startTransition(async () => {
      const error = await updateEvent(tenantId, values);
      if (error) {
        form.setError("root", { message: error });
      } else {
        form.reset(values);
        setSaved(true);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

      <FieldGroup>
        <Controller name="title" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="event-title" required>Title</FormLabel>
            <FieldDescription>Event name</FieldDescription>
            <Input {...field} id="event-title" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />

        <Controller name="year" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="event-year" required>Year</FormLabel>
            <Input
              id="event-year"
              type="number"
              aria-invalid={fieldState.invalid}
              value={field.value}
              onChange={e => field.onChange(Number(e.target.value))}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />

        <Controller name="location" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="event-location" required>Location</FormLabel>
            <FieldDescription>Display string shown to registrants, e.g. Example Hall, Portland, OR</FieldDescription>
            <Input {...field} id="event-location" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />

        <Controller name="date" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="event-date" required>Date</FormLabel>
            <FieldDescription>Display string shown to registrants, e.g. October 3-5, 2025</FieldDescription>
            <Input {...field} id="event-date" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />

        <Controller name="timezone" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="event-timezone" required>Timezone</FormLabel>
            <FieldDescription>IANA timezone</FieldDescription>
            <Input {...field} id="event-timezone" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />
      </FieldGroup>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-base font-medium">Google Calendar Event (optional)</h2>
        <FieldGroup>
          <Controller name="calendar.title" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormLabel htmlFor="event-cal-title">Title</FormLabel>
              <Input {...field} id="event-cal-title" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />

          <Controller name="calendar.description" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormLabel htmlFor="event-cal-description">Description</FormLabel>
              <Input {...field} id="event-cal-description" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />

          <Controller name="calendar.location" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormLabel htmlFor="event-cal-location">Location</FormLabel>
              <Input {...field} id="event-cal-location" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />

          <Controller name="calendar.start" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormLabel htmlFor="event-cal-start">Start</FormLabel>
              <FieldDescription>ISO 8601 with offset, e.g. 2025-10-03T19:00:00-07:00</FieldDescription>
              <Input {...field} id="event-cal-start" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />

          <Controller name="calendar.end" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormLabel htmlFor="event-cal-end">End</FormLabel>
              <FieldDescription>ISO 8601 with offset, e.g. 2025-10-05T15:00:00-07:00</FieldDescription>
              <Input {...field} id="event-cal-end" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />
        </FieldGroup>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-base font-medium">Contacts</h2>
        <FieldGroup>
          <Controller name="contacts.info" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormLabel htmlFor="event-contact-info" required>Info email</FormLabel>
              <Input {...field} id="event-contact-info" type="email" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />

          <Controller name="contacts.housing" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormLabel htmlFor="event-contact-housing">Housing email</FormLabel>
              <Input {...field} id="event-contact-housing" type="email" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />
        </FieldGroup>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-base font-medium">Links</h2>
        <FieldGroup>
          <Controller name="links.info" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormLabel htmlFor="event-link-info">More info URL</FormLabel>
              <Input {...field} id="event-link-info" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />

          <Controller name="links.health" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormLabel htmlFor="event-link-health">Health policy URL</FormLabel>
              <Input {...field} id="event-link-health" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />

          <Controller name="links.safety" control={form.control} render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormLabel htmlFor="event-link-safety">Safety policy URL</FormLabel>
              <Input {...field} id="event-link-safety" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )} />
        </FieldGroup>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-base font-medium">Nametags</h2>
        <FieldGroup>
          <Controller name="nametags.includePronouns" control={form.control} render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FormLabel htmlFor="event-nametag-pronouns">Include pronouns</FormLabel>
              </FieldContent>
              <Switch
                id="event-nametag-pronouns"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
            </Field>
          )} />

          <Controller name="nametags.includeLastName" control={form.control} render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FormLabel htmlFor="event-nametag-last-name">Include last name</FormLabel>
              </FieldContent>
              <Switch
                id="event-nametag-last-name"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
            </Field>
          )} />
        </FieldGroup>
      </div>

      {form.formState.errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending || !isDirty}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        {saved && (
          <span className="text-sm text-muted-foreground">Saved ✓</span>
        )}
      </div>
    </form>
  );
}
