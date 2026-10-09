"use client";

import { Controller, type Control } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { AutosaveStatus } from "@/components/autosave-status";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import type { Tenant } from "@repo/types";
import { themeConfigSchema, type ThemeConfig } from "@repo/tenant-config";
import { updateAppearance } from "./actions";

function ColorField({ name, label, control }: { name: keyof ThemeConfig; label: string; control: Control<ThemeConfig> }) {
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

export function AppearanceForm({ tenant }: { tenant: Tenant }) {
  const { form, formProps, isPending, savedRecently } = useAutosaveForm({
    schema: themeConfigSchema,
    defaultValues: tenant.theme_config,
    save: (data) => updateAppearance(tenant.id, data),
  });

  return (
    <form {...formProps} className="space-y-8">

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

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
