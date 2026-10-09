"use client";

import { Controller } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Field, FieldContent, FieldDescription, FieldGroup } from "@/components/ui/field";
import { AutosaveStatus } from "@/components/autosave-status";
import { FormLabel } from "@/components/form-label";
import { TextField } from "@/components/form-text-field";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import type { Tenant } from "@repo/types";
import { generalSchema } from "./schema";
import { updateGeneral } from "./actions";

export function GeneralForm({ tenant }: { tenant: Tenant }) {
  const { form, formProps, isPending, savedRecently } = useAutosaveForm({
    schema: generalSchema,
    defaultValues: {
      slug: tenant.slug,
      is_live: tenant.is_live,
      show_preregistration: tenant.show_preregistration,
    },
    save: (data) => updateGeneral(tenant.id, data),
  });

  return (
    <form {...formProps} className="space-y-8">
      <FieldGroup>

        <TextField
          control={form.control}
          name="slug"
          id="general-slug"
          label="Subdomain"
          description="e.g. example → example.folkreg.org"
          autoComplete="off"
          required
        />

      </FieldGroup>

      <Separator />

      <FieldGroup>

        <Controller
          name="show_preregistration"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <FieldContent>
                <FormLabel htmlFor="general-preregistration">Show preregistration?</FormLabel>
                <FieldDescription>When on, shows policy acknowledgment checkbox before registration</FieldDescription>
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
                <div className="flex items-center gap-2">
                  <FormLabel htmlFor="general-is-live">Live mode?</FormLabel>
                  <Badge variant={field.value ? "destructive" : "secondary"}>
                    {field.value ? "LIVE" : "SANDBOX"}
                  </Badge>
                </div>
                <FieldDescription>Registration is currently <strong>{field.value ? "open" : "closed"}</strong> to the public</FieldDescription>
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

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
