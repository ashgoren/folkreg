"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
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
      if (!generalSchema.safeParse(values).success) return;
      saveDebounced(values as GeneralValues);
    });
    return () => subscription.unsubscribe();
  }, [form, saveDebounced]);

  return (
    <div className="space-y-8">
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
                <FieldDescription>{field.value ? "Shows policy acknowledgment checkbox before registration" : "Does not show policy acknowledgment checkbox before registration"}</FieldDescription>
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
                <FieldDescription>Registration is {field.value ? "open" : "closed"} to the public</FieldDescription>
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

      <div className="text-sm text-muted-foreground h-5">
        {isPending ? "Saving…" : savedRecently ? "Saved ✓" : null}
      </div>
    </div>
  );
}
