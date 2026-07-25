"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import { SecretInput } from "@/components/ui/secret-input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAutosave } from "@/lib/useAutosave";
import type { Tenant, TenantSecrets } from "@repo/types";
import { waiversSchema, type WaiversValues } from "./schema";
import { updateWaivers } from "./actions";

export function WaiversForm({ tenant, secrets }: { tenant: Tenant; secrets: TenantSecrets }) {
  const waiverConfig = tenant.waiver_config;

  const form = useForm<WaiversValues>({
    mode: "onBlur",
    resolver: zodResolver(waiversSchema),
    defaultValues: {
      show: waiverConfig?.show ?? false,
      docusealTemplateId: waiverConfig?.docusealTemplateId ?? "",
      docuseal_key: secrets.docuseal_key ?? "",
    },
  });

  const { saveDebounced, isPending, savedRecently } = useAutosave<WaiversValues>(
    (data) => updateWaivers(tenant.id, data),
  );

  const showWaiver = form.watch("show");

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!waiversSchema.safeParse(values).success) return;
      saveDebounced(values as WaiversValues);
    });
    return () => subscription.unsubscribe();
  }, [form, saveDebounced]);

  return (
    <div className="space-y-8">

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

      {showWaiver && (
        <>
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
                <SecretInput {...field} id="waivers-api-key" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
          </FieldGroup>
        </>
      )}

      <div className="text-sm text-muted-foreground h-5">
        {isPending ? "Saving…" : savedRecently ? "Saved ✓" : null}
      </div>
    </div>
  );
}
