"use client";

import { Controller, useWatch } from "react-hook-form";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { AutosaveStatus } from "@/components/autosave-status";
import { FormLabel } from "@/components/form-label";
import { TextField } from "@/components/form-text-field";
import { SecretInput } from "@/components/ui/secret-input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import type { Tenant, TenantSecrets } from "@repo/types";
import { waiversSchema } from "./schema";
import { updateWaivers } from "./actions";

export function WaiversForm({ tenant, secrets }: { tenant: Tenant; secrets: TenantSecrets }) {
  const { form, isPending, savedRecently } = useAutosaveForm({
    schema: waiversSchema,
    defaultValues: {
      ...tenant.waiver_config,
      docuseal_key: secrets.docuseal_key ?? "",
    },
    save: (data) => updateWaivers(tenant.id, data),
  });

  const showWaiver = useWatch({ control: form.control, name: "show" });

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">

      <FieldGroup>
        <Controller name="show" control={form.control} render={({ field, fieldState }) => (
          <Field orientation="horizontal" data-invalid={fieldState.invalid}>
            <FieldContent>
              <FormLabel htmlFor="waivers-show">Show waiver?</FormLabel>
              <FieldDescription>When on, registrants must sign a waiver before completing registration</FieldDescription>
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
            <TextField control={form.control} name="docusealTemplateId" id="waivers-template-id" label="DocuSeal template ID" autoComplete="off" />

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

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
