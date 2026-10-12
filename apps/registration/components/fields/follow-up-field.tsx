import { Controller, type Control, type FieldValues } from "react-hook-form";
import type { FollowUp } from "@repo/fields";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Rendered by RadioField/CheckboxGroupField when their own value matches followUp.triggerValue --
// not a top-level FieldType, since a follow-up only ever exists attached to the field that reveals
// it. name is the full path to followUp.storageKey (the triggering field's own parent path plus the
// storage key), computed by the caller since storageKey alone doesn't say which person it belongs to.
export function FollowUpField({ control, name, followUp }: { control: Control<FieldValues>; name: string; followUp: FollowUp }) {
  const InputComponent = followUp.rows ? Textarea : Input;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FormLabel htmlFor={name}>{followUp.label}</FormLabel>
          {followUp.description && <FieldDescription>{followUp.description}</FieldDescription>}
          <InputComponent
            {...field}
            value={typeof field.value === "string" ? field.value : ""}
            id={name}
            rows={followUp.rows}
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
