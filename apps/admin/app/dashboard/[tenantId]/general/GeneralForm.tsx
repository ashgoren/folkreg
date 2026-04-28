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
import { generalSchema, type GeneralValues } from "./schema";
import { updateGeneral } from "./actions";

export function GeneralForm({ tenant, tenantId }: { tenant: Tenant; tenantId: string }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const regConfig = tenant.registration_config;

  const form = useForm<GeneralValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      slug: tenant.slug,
      domain: tenant.domain ?? "",
      is_live: tenant.is_live,
      waitlistCutoff: regConfig?.waitlistCutoff ?? null,
      showPreregistration: regConfig?.showPreregistration ?? false,
    },
  });

  const isDirty = form.formState.isDirty;
  useEffect(() => { if (isDirty) setSaved(false); }, [isDirty]);

  function onSubmit(values: GeneralValues) {
    setSaved(false);
    startTransition(async () => {
      const error = await updateGeneral(tenantId, values);
      if (error) {
        form.setError('root', { message: error });
      } else {
        form.reset(values);
        setSaved(true);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <FieldGroup>

        <Controller
          name="slug"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormLabel htmlFor="general-slug" required>Subdomain</FormLabel>
              <FieldDescription>e.g. example → example.folkreg.org</FieldDescription>
              <Input {...field} id="general-slug" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="domain"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormLabel htmlFor="general-domain">Custom domain</FormLabel>
              <FieldDescription>Optional custom domain, e.g. example.org</FieldDescription>
              <Input {...field} id="general-domain" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="waitlistCutoff"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FormLabel htmlFor="general-waitlist-cutoff">Waitlist cutoff</FormLabel>
              <FieldDescription>Max registrations before waitlist kicks in &mdash; <em>leave blank for no capacity limit</em></FieldDescription>
              <Input
                id="general-waitlist-cutoff"
                type="number"
                aria-invalid={fieldState.invalid}
                value={field.value ?? ""}
                onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

      </FieldGroup>

      <Separator />

      <FieldGroup>

        <Controller
          name="showPreregistration"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FormLabel htmlFor="general-preregistration">Show preregistration</FormLabel>
                <FieldDescription>Show a policy acknowledgment checkbox before registration</FieldDescription>
              </FieldContent>
              <Switch
                id="general-preregistration"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
            </Field>
          )}
        />

        <Controller
          name="is_live"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FormLabel htmlFor="general-is-live">Live</FormLabel>
                <FieldDescription>Registration is open to the public</FieldDescription>
              </FieldContent>
              <Switch
                id="general-is-live"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
            </Field>
          )}
        />

      </FieldGroup>

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
