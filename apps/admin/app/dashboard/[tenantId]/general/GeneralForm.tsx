"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldContent, FieldDescription, FieldGroup } from "@/components/ui/field";
import { AutosaveStatus } from "@/components/autosave-status";
import { FormLabel } from "@/components/form-label";
import { TextField } from "@/components/form-text-field";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAutosave } from "@/lib/useAutosave";
import type { Tenant } from "@repo/types";
import { generalSchema, type GeneralValues } from "./schema";
import { updateGeneral } from "./actions";

export function GeneralForm({ tenant }: { tenant: Tenant }) {
  const form = useForm<GeneralValues>({
    mode: "onBlur",
    resolver: zodResolver(generalSchema),
    defaultValues: {
      slug: tenant.slug,
      is_live: tenant.is_live,
      show_preregistration: tenant.show_preregistration,
    },
  });

  const { saveDebounced, isPending, savedRecently } = useAutosave<GeneralValues>(
    (data) => updateGeneral(tenant.id, data),
  );

  useEffect(() => {
    const subscription = form.watch((values) => {
      const parsed = generalSchema.safeParse(values);
      if (!parsed.success) return;
      saveDebounced(parsed.data);
    });
    return () => subscription.unsubscribe();
  }, [form, saveDebounced]);

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
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
                <FormLabel htmlFor="general-is-live">Live mode?</FormLabel>
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
