"use client";

import { Controller, type Control } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { AutosaveStatus } from "@/components/autosave-status";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import { normalizeHex } from "@/lib/normalize-hex";
import type { Tenant } from "@repo/types";
import { themeConfigSchema, type ThemeConfig } from "@repo/tenant-config";
import { updateAppearance } from "./actions";

const isHexColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

type ColorFieldProps = {
  name: keyof ThemeConfig;
  label: string;
  control: Control<ThemeConfig>;
  description?: string;
  optional?: boolean;
};

function ColorField({ name, label, control, description, optional }: ColorFieldProps) {
  return (
    <Controller name={name} control={control} render={({ field, fieldState }) => {
      const noColor = !isHexColor(field.value);
      return (
        <Field data-invalid={fieldState.invalid}>
          <FormLabel htmlFor={`appearance-${name}`} required={!optional}>{label}</FormLabel>
          {description && <FieldDescription>{description}</FieldDescription>}
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-10 shrink-0">
              <input
                type="color"
                value={noColor ? "#ffffff" : field.value}
                onChange={e => field.onChange(e.target.value)}
                aria-label={`${label} swatch`}
                className="size-full rounded border border-input p-0.5"
              />
              {noColor && (
                <span
                  data-no-color
                  aria-hidden
                  className="pointer-events-none absolute inset-1 bg-[linear-gradient(to_top_right,transparent_calc(50%-1px),var(--destructive)_50%,transparent_calc(50%+1px))]"
                />
              )}
            </div>
            <Input
              {...field} // includes onChange, which updates the same value as the color input
              id={`appearance-${name}`}
              aria-invalid={fieldState.invalid}
              onBlur={() => {
                // This runs before the form's own onBlur, where autosave saves.
                const tidied = normalizeHex(field.value);
                if (tidied !== field.value) field.onChange(tidied);
                field.onBlur();
              }}
            />
          </div>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      );
    }} />
  );
}

const HEADER_DESCRIPTION = "Optional. Leave blank to tint the background with the accent.";

export function AppearanceForm({ tenant }: { tenant: Tenant }) {
  const { form, formProps, isPending, savedRecently } = useAutosaveForm({
    label: "Appearance",
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
          <ColorField name="headerLight" label="Header" control={form.control} description={HEADER_DESCRIPTION} optional />
        </FieldGroup>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="text-base font-medium">Dark mode</h2>
        <FieldGroup>
          <ColorField name="backgroundDark" label="Background" control={form.control} />
          <ColorField name="foregroundDark" label="Foreground" control={form.control} />
          <ColorField name="accentDark" label="Accent" control={form.control} />
          <ColorField name="headerDark" label="Header" control={form.control} description={HEADER_DESCRIPTION} optional />
        </FieldGroup>
      </div>

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
