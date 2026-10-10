"use client";

import { Controller, useWatch, type Control } from "react-hook-form";
import { FIELD_DEFS, toggleOption, type FieldName } from "@repo/fields";
import type { FieldsConfig } from "@repo/tenant-config";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, FieldDescription, FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import type { FieldEntryPath } from "./ConfigPanel";

/**
 * A radio or checkbox field's default, chosen from its own options the way a registrant would
 * choose: radio buttons (plus "None") or checkboxes. Checkboxes keep the field's prerequisite rule
 * (toggleOption), e.g. checking a roster detail checks the name too.
 *
 * A default can outlive its option -- the option's value edited or the option removed. It's still
 * listed, marked "not an option", with the schema's error beneath, so the organizer can see what's
 * wrong and choose again (or uncheck it).
 */
export function ChoiceDefault({
  control,
  path,
  fieldName,
}: {
  control: Control<FieldsConfig>;
  path: FieldEntryPath;
  fieldName: FieldName;
}) {
  const def = FIELD_DEFS[fieldName];
  const options = useWatch({ control, name: `${path}.options` }) ?? [];
  // An option still being written has no value yet, so there's nothing to choose.
  const choices = options
    .filter((option) => option.value !== "")
    .map((option) => ({ value: option.value, label: option.label || option.value }));
  const known = new Set(choices.map((choice) => choice.value));
  const notAnOption = (value: string) => ({ value, label: `${value} (not an option)` });

  return (
    <Controller
      name={`${path}.defaultValue`}
      control={control}
      render={({ field, fieldState }) => {
        const error = fieldState.invalid && <FieldError errors={[fieldState.error]} />;

        if (def.type === "checkbox") {
          const selected = Array.isArray(field.value) ? field.value : [];
          const items = [...choices, ...selected.filter((value) => !known.has(value)).map(notAnOption)];
          return (
            <FieldSet data-invalid={fieldState.invalid}>
              <FieldLegend variant="label">Default</FieldLegend>
              <FieldDescription>Checked to start with on the registration form.</FieldDescription>
              {items.length === 0 && <p className="text-sm text-muted-foreground italic">Add options to choose from.</p>}
              {items.map((item, i) => (
                <Field key={i} orientation="horizontal">
                  <Checkbox
                    id={`config-default-${fieldName}-${i}`}
                    checked={selected.includes(item.value)}
                    onCheckedChange={(checked) => field.onChange(toggleOption(def, selected, item.value, checked === true))}
                  />
                  <FormLabel htmlFor={`config-default-${fieldName}-${i}`} className="font-normal">{item.label}</FormLabel>
                </Field>
              ))}
              {error}
            </FieldSet>
          );
        }

        const value = typeof field.value === "string" ? field.value : "";
        const items = [
          { value: "", label: "None" },
          ...choices,
          ...(value !== "" && !known.has(value) ? [notAnOption(value)] : []),
        ];
        return (
          <FieldSet data-invalid={fieldState.invalid}>
            <FieldLegend variant="label">Default</FieldLegend>
            <FieldDescription>Selected to start with on the registration form.</FieldDescription>
            <RadioGroup value={value} onValueChange={field.onChange}>
              {items.map((item, i) => (
                <Field key={i} orientation="horizontal">
                  <RadioGroupItem value={item.value} id={`config-default-${fieldName}-${i}`} />
                  <FormLabel htmlFor={`config-default-${fieldName}-${i}`} className="font-normal">{item.label}</FormLabel>
                </Field>
              ))}
            </RadioGroup>
            {error}
          </FieldSet>
        );
      }}
    />
  );
}
