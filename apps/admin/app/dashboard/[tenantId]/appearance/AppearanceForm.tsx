"use client";

import { useEffect, useState, useTransition } from "react";
import { Controller, useForm, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { Tenant } from "@repo/types";
import { appearanceSchema, type AppearanceValues } from "./schema";
import { updateAppearance } from "./actions";

const DEFAULTS: AppearanceValues = {
  backgroundLight: "#ffffff",
  foregroundLight: "#0a0a0a",
  accentLight: "#2563eb",
  backgroundDark: "#0a0a0a",
  foregroundDark: "#fafafa",
  accentDark: "#3b82f6",
};

function ColorField({ name, label, control }: { name: keyof AppearanceValues; label: string; control: Control<AppearanceValues> }) {
  return (
    <Controller name={name} control={control} render={({ field, fieldState }) => (
      <Field data-invalid={fieldState.invalid}>
        <FormLabel htmlFor={`appearance-${name}`} required>{label}</FormLabel>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={fieldState.invalid ? "#000000" : field.value}
            onChange={e => field.onChange(e.target.value)}
            aria-label={`${label} swatch`}
            className="h-8 w-10 shrink-0 rounded border border-input p-0.5"
          />
          <Input {...field} id={`appearance-${name}`} aria-invalid={fieldState.invalid} /> {/* ...field includes onChange to update the same value as the color input */}
        </div>
        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
      </Field>
    )} />
  );
}

export function AppearanceForm({ tenant, tenantId }: { tenant: Tenant; tenantId: string }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const themeConfig = tenant.theme_config;

  const form = useForm<AppearanceValues>({
    resolver: zodResolver(appearanceSchema),
    defaultValues: {
      backgroundLight: themeConfig?.backgroundLight ?? DEFAULTS.backgroundLight,
      foregroundLight: themeConfig?.foregroundLight ?? DEFAULTS.foregroundLight,
      accentLight: themeConfig?.accentLight ?? DEFAULTS.accentLight,
      backgroundDark: themeConfig?.backgroundDark ?? DEFAULTS.backgroundDark,
      foregroundDark: themeConfig?.foregroundDark ?? DEFAULTS.foregroundDark,
      accentDark: themeConfig?.accentDark ?? DEFAULTS.accentDark,
    },
  });

  const isDirty = form.formState.isDirty;
  useEffect(() => { if (isDirty) setSaved(false) }, [isDirty]);

  function onSubmit(values: AppearanceValues) {
    setSaved(false);
    startTransition(async () => {
      const error = await updateAppearance(tenantId, values);
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

      <FieldDescription>
        If applicable, match the static site theme by copying these from the <code>:root</code> block in the static site&apos;s <code>globals.css</code>.
      </FieldDescription>

      <div className="space-y-4">
        <h2 className="text-base font-medium">Light mode</h2>
        <FieldGroup>
          <ColorField name="backgroundLight" label="Background" control={form.control} />
          <ColorField name="foregroundLight" label="Foreground" control={form.control} />
          <ColorField name="accentLight" label="Accent" control={form.control} />
        </FieldGroup>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-base font-medium">Dark mode</h2>
        <FieldGroup>
          <ColorField name="backgroundDark" label="Background" control={form.control} />
          <ColorField name="foregroundDark" label="Foreground" control={form.control} />
          <ColorField name="accentDark" label="Accent" control={form.control} />
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
