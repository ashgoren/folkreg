"use client";

import { Controller, type Control, type UseFormReturn } from "react-hook-form";
import { FIELD_DEFS, type FieldName } from "@repo/fields";
import type { FieldsConfig, FieldsConfigInput } from "@repo/tenant-config";
import { Field, FieldContent, FieldError, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { TextField } from "@/components/form-text-field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, Plus } from "lucide-react";

// Where an active field's entry sits in the form's values, e.g. "contact.2".
export type FieldEntryPath = `${"contact" | "misc"}.${number}`;

interface ConfigPanelProps {
  form: UseFormReturn<FieldsConfigInput, unknown, FieldsConfig>;
  path: FieldEntryPath;
  fieldName: FieldName;
}

export function ConfigPanel({ form, path, fieldName }: ConfigPanelProps) {
  const def = FIELD_DEFS[fieldName];
  const { control } = form;

  const showHeading = def.group === "misc";
  const showPlaceholder = def.type !== "radio" && def.type !== "checkbox";
  const showWidth = def.group === "contact";
  const showRows = def.type === "textarea";
  const showOptions = def.type === "radio" || def.type === "checkbox";
  const showNametagToggle = def.canIncludeOnNametag ?? false;

  return (
    <div className="border rounded-lg p-6 space-y-6 w-full max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">{fieldName}</h2>
          <span className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">
            {def.type} input
          </span>
        </div>
        <div className="flex flex-col items-end gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Required</span>
            <Controller
              name={`${path}.required`}
              control={control}
              render={({ field }) => (
                <Switch
                  id={`config-required-${fieldName}`}
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
          {showWidth && <NumberSetting control={control} name={`${path}.width`} caption="Width" max={12} />}
          {showRows && <NumberSetting control={control} name={`${path}.rows`} caption="Rows" />}
        </div>
      </div>

      <Separator />

      <FieldGroup>
        {showHeading && (
          <TextField control={control} name={`${path}.title`} id={`config-title-${fieldName}`} label="Heading" autoComplete="off" />
        )}

        {showHeading ? (
          // Misc fields' labels are usually a sentence or two of explanation.
          <Controller
            name={`${path}.label`}
            control={control}
            render={({ field }) => (
              <Field>
                <FormLabel htmlFor={`config-label-${fieldName}`}>Label</FormLabel>
                <textarea
                  {...field}
                  id={`config-label-${fieldName}`}
                  rows={3}
                  value={field.value ?? ""}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
                />
              </Field>
            )}
          />
        ) : (
          <TextField control={control} name={`${path}.label`} id={`config-label-${fieldName}`} label="Label" autoComplete="off" />
        )}

        {showPlaceholder && (
          <TextField control={control} name={`${path}.placeholder`} id={`config-placeholder-${fieldName}`} label="Placeholder" autoComplete="off" />
        )}

        {showOptions && (
          // The whole list is one value: each edit, add, or remove replaces it.
          <Controller
            name={`${path}.options`}
            control={control}
            render={({ field }) => {
              const options = field.value ?? [];
              return (
                <Field>
                  <FormLabel>
                    {def.type === "radio" ? "Radio options" : "Checkbox options"}
                  </FormLabel>
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                      <span className="flex-3">Label</span>
                      <span className="flex-1">Value</span>
                      <span className="w-5" />
                    </div>
                    {options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          className="flex-3"
                          value={opt.label}
                          onChange={(e) => field.onChange(options.map((o, j) => (j === i ? { ...o, label: e.target.value } : o)))}
                        />
                        <Input
                          className="flex-1"
                          value={opt.value}
                          onChange={(e) => field.onChange(options.map((o, j) => (j === i ? { ...o, value: e.target.value } : o)))}
                        />
                        <button
                          type="button"
                          onClick={() => field.onChange(options.filter((_, j) => j !== i))}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          aria-label="Remove option"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => field.onChange([...options, { label: "", value: "" }])}
                    >
                      <Plus size={14} className="mr-1" />
                      Add option
                    </Button>
                  </div>
                </Field>
              );
            }}
          />
        )}

        <TextField
          control={control}
          name={`${path}.defaultValue`}
          id={`config-default-${fieldName}`}
          label="Default"
          description={def.type === "checkbox" ? "Comma-separated option values" : undefined}
          autoComplete="off"
        />

        {showNametagToggle && (
          <Controller
            name={`${path}.includeOnNametag`}
            control={control}
            render={({ field }) => (
              <Field orientation="horizontal">
                <FieldContent>
                  <FormLabel htmlFor={`config-nametag-${fieldName}`}>
                    Include on nametag?
                  </FormLabel>
                </FieldContent>
                <Switch
                  id={`config-nametag-${fieldName}`}
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </Field>
            )}
          />
        )}
      </FieldGroup>
    </div>
  );
}

// A number input's value is "" both when it's empty and when it holds text that isn't a number
// (browsers allow typing letters into one; Chrome allows "e"). Empty unsets the setting; anything
// else unparseable is NaN, which the schema rejects with an error beside what was typed.
const numberSetting = ({ value, validity }: HTMLInputElement) => {
  if (value !== "") return Number(value);
  return validity.badInput ? NaN : null;
};

// A small optional whole-number setting (width, rows) beside a caption, with its error beneath.
// Clearing it unsets the setting, so the registration form uses its own layout default, rather
// than storing 0 or NaN. The cleared value is null, not undefined: react-hook-form shows an
// undefined value as the one the form loaded with, so the input would refill itself.
function NumberSetting({
  control,
  name,
  caption,
  max,
}: {
  control: Control<FieldsConfigInput, unknown, FieldsConfig>;
  name: `${FieldEntryPath}.width` | `${FieldEntryPath}.rows`;
  caption: string;
  max?: number;
}) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-muted-foreground">{caption}</span>
            <input
              type="number"
              min={1}
              max={max}
              value={field.value ?? ""}
              onChange={(e) => field.onChange(numberSetting(e.target))}
              onBlur={(e) => {
                // Typing text into an empty input leaves its value "", so React fires no change
                // for it; leaving the input is when that text gets noticed.
                const value = numberSetting(e.target);
                if (!Object.is(value, field.value)) field.onChange(value);
                field.onBlur();
              }}
              aria-invalid={fieldState.invalid}
              className="w-12 rounded border border-input bg-background px-1.5 py-0.5 text-sm text-center aria-invalid:border-destructive [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </div>
      )}
    />
  );
}
