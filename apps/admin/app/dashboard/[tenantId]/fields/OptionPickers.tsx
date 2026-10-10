"use client";

import { Controller, useWatch, type Control } from "react-hook-form";
import { FIELD_DEFS, toggleOption, type FieldName } from "@repo/fields";
import type { FieldsConfig } from "@repo/tenant-config";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field, FieldDescription, FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import type { FieldEntryPath } from "./ConfigPanel";

// Settings of a radio or checkbox field that choose among its own options: its default, and which
// options the person registering may pick. Each is chosen the way a registrant would choose.
//
// A chosen value can outlive its option - the option's value edited, or the option removed. It's
// still listed, marked "not an option", with the schema's error beneath, so the organizer can see
// what's wrong and choose again (or uncheck it).

type Choice = { value: string; label: string };

const notAnOption = (value: string): Choice => ({ value, label: `${value} (not an option)` });

// The field's options as choices. An option still being written has no value yet, so there's nothing to choose.
function useChoices(control: Control<FieldsConfig>, path: FieldEntryPath) {
  const options = useWatch({ control, name: `${path}.options` }) ?? [];
  const choices = options
    .filter((option) => option.value !== "")
    .map((option) => ({ value: option.value, label: option.label || option.value }));
  const known = new Set(choices.map((choice) => choice.value));
  return { choices, isOption: (value: string) => known.has(value) };
}

// A checkbox per choice, plus any checked value that's no longer an option.
function CheckboxChoices({ id, legend, description, choices, isOption, selected, onToggle, error }: {
  id: string;
  legend: string;
  description: string;
  choices: Choice[];
  isOption: (value: string) => boolean;
  selected: string[];
  onToggle: (value: string, checked: boolean) => void;
  error: React.ReactNode;
}) {
  const items = [...choices, ...selected.filter((value) => !isOption(value)).map(notAnOption)];
  return (
    <FieldSet data-invalid={Boolean(error)}>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <FieldDescription>{description}</FieldDescription>
      {items.length === 0 && <p className="text-sm text-muted-foreground italic">Add options to choose from.</p>}
      {items.map((item, i) => (
        <Field key={i} orientation="horizontal">
          <Checkbox
            id={`${id}-${i}`}
            checked={selected.includes(item.value)}
            onCheckedChange={(checked) => onToggle(item.value, checked === true)}
          />
          <FormLabel htmlFor={`${id}-${i}`} className="font-normal">{item.label}</FormLabel>
        </Field>
      ))}
      {error}
    </FieldSet>
  );
}

/**
 * A radio or checkbox field's default: radio buttons (plus "None") or checkboxes. Checkboxes keep
 * the field's prerequisite rule (toggleOption), e.g. checking a roster detail checks the name too.
 */
export function ChoiceDefault({ control, path, fieldName }: {
  control: Control<FieldsConfig>;
  path: FieldEntryPath;
  fieldName: FieldName;
}) {
  const def = FIELD_DEFS[fieldName];
  const { choices, isOption } = useChoices(control, path);
  const id = `config-default-${fieldName}`;

  return (
    <Controller
      name={`${path}.defaultValue`}
      control={control}
      render={({ field, fieldState }) => {
        const error = fieldState.invalid && <FieldError errors={[fieldState.error]} />;

        if (def.type === "checkbox") {
          const selected = Array.isArray(field.value) ? field.value : [];
          return (
            <CheckboxChoices
              id={id}
              legend="Default"
              description="Checked to start with on the registration form."
              choices={choices}
              isOption={isOption}
              selected={selected}
              onToggle={(value, checked) => field.onChange(toggleOption(def, selected, value, checked))}
              error={error}
            />
          );
        }

        const value = typeof field.value === "string" ? field.value : "";
        const items = [
          { value: "", label: "None" },
          ...choices,
          ...(value !== "" && !isOption(value) ? [notAnOption(value)] : []),
        ];
        return (
          <FieldSet data-invalid={fieldState.invalid}>
            <FieldLegend variant="label">Default</FieldLegend>
            <FieldDescription>Selected to start with on the registration form.</FieldDescription>
            <RadioGroup value={value} onValueChange={field.onChange}>
              {items.map((item, i) => (
                <Field key={i} orientation="horizontal">
                  <RadioGroupItem value={item.value} id={`${id}-${i}`} />
                  <FormLabel htmlFor={`${id}-${i}`} className="font-normal">{item.label}</FormLabel>
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

/**
 * Which options the person registering (the first person in an order) may choose, for a field that
 * can limit them - e.g. age brackets old enough to register.
 */
export function FirstPersonOptions({ control, path, fieldName }: {
  control: Control<FieldsConfig>;
  path: FieldEntryPath;
  fieldName: FieldName;
}) {
  const { choices, isOption } = useChoices(control, path);

  return (
    <Controller
      name={`${path}.firstPersonOptions`}
      control={control}
      render={({ field, fieldState }) => {
        const selected = field.value ?? [];
        return (
          <CheckboxChoices
            id={`config-first-person-${fieldName}`}
            legend="Can register a group"
            description="The options the person registering may choose. Everyone they register may choose any option."
            choices={choices}
            isOption={isOption}
            selected={selected}
            onToggle={(value, checked) => field.onChange(checked ? [...selected, value] : selected.filter((v) => v !== value))}
            error={fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          />
        );
      }}
    />
  );
}
