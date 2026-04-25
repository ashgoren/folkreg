"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { Tenant } from "@repo/types";
import { generalSchema, type GeneralValues } from "./schema";
import { updateGeneral } from "./actions";

export function GeneralForm({ tenant, tenantId }: { tenant: Tenant; tenantId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const regConfig = tenant.registration_config;

  const form = useForm<GeneralValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      slug: tenant.slug,
      domain: tenant.domain ?? "",
      is_live: tenant.is_live,
      waitlistEnabled: regConfig?.waitlistCutoff != null,
      waitlistCutoff: regConfig?.waitlistCutoff ?? null,
      showPreregistration: regConfig?.showPreregistration ?? false,
    },
  });

  const waitlistEnabled = form.watch("waitlistEnabled");

  function onSubmit(values: GeneralValues) {
    setResult(null);
    startTransition(async () => {
      const error = await updateGeneral(tenantId, values);
      if (error) {
        setResult({ success: false, message: error });
      } else {
        form.reset(values); // clear dirty state after successful save
        setResult({ success: true, message: "Saved." });
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
              <FieldLabel htmlFor="general-slug">Slug</FieldLabel>
              <FieldDescription>Platform subdomain identifier (e.g. snowdance → snowdance.folkreg.org)</FieldDescription>
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
              <FieldLabel htmlFor="general-domain">Domain</FieldLabel>
              <FieldDescription>Custom domain for the registration app</FieldDescription>
              <Input {...field} id="general-domain" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Separator />

      <FieldGroup>
        <Controller
          name="is_live"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FieldLabel htmlFor="general-is-live">Live</FieldLabel>
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
        <Controller
          name="showPreregistration"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FieldLabel htmlFor="general-preregistration">Show preregistration</FieldLabel>
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
          name="waitlistEnabled"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FieldLabel htmlFor="general-waitlist">Enable waitlist</FieldLabel>
                <FieldDescription>New registrations go to the waitlist after capacity is reached</FieldDescription>
              </FieldContent>
              <Switch
                id="general-waitlist"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-invalid={fieldState.invalid}
              />
            </Field>
          )}
        />
        {waitlistEnabled && (
          <Controller
            name="waitlistCutoff"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="general-waitlist-cutoff">Waitlist capacity</FieldLabel>
                <FieldDescription>Number of registrations before waitlist kicks in</FieldDescription>
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
        )}
      </FieldGroup>

      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          <AlertDescription>{result.message}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={isPending || !form.formState.isDirty}>
        {isPending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
