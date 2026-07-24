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
import type { Tenant, TenantSecrets } from "@repo/types";
import { waiversSchema, type WaiversValues } from "./schema";
import { updateWaivers } from "./actions";

export function WaiversForm({ tenant, secrets }: { tenant: Tenant; secrets: TenantSecrets }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const waiverConfig = tenant.waiver_config;

  const form = useForm<WaiversValues>({
    resolver: zodResolver(waiversSchema),
    defaultValues: {
      show: waiverConfig?.show ?? false,
      docusealTemplateId: waiverConfig?.docusealTemplateId ?? "",
      docuseal_key: secrets.docuseal_key ?? "",
    },
  });

  const isDirty = form.formState.isDirty;
  useEffect(() => { if (isDirty) setSaved(false) }, [isDirty]);

  function onSubmit(values: WaiversValues) {
    setSaved(false);
    startTransition(async () => {
      const error = await updateWaivers(tenant.id, values);
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
        <Controller name="show" control={form.control} render={({ field, fieldState }) => (
          <Field orientation="horizontal" data-invalid={fieldState.invalid}>
            <FieldContent>
              <FormLabel htmlFor="waivers-show">Show waiver</FormLabel>
              <FieldDescription>Registrants must sign a waiver before completing registration</FieldDescription>
            </FieldContent>
            <Switch
              id="waivers-show"
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-invalid={fieldState.invalid}
            />
          </Field>
        )} />
      </FieldGroup>

      <Separator />

      <FieldGroup>
        <Controller name="docusealTemplateId" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="waivers-template-id">DocuSeal template ID</FormLabel>
            <Input {...field} id="waivers-template-id" autoComplete="off" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />

        <Controller name="docuseal_key" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="waivers-api-key">DocuSeal API key</FormLabel>
            <Input {...field} id="waivers-api-key" type="password" autoComplete="new-password" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />
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
