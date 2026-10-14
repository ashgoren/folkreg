"use client";

import type { FieldsConfig, WaiverConfig } from "@repo/tenant-config";
import type { InitialOrder, RegistrationParty } from "./registration-party";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, type Control, type FieldValues } from "react-hook-form";
import { PersonCard } from "@/components/person-card";
import { activeFields, buildDefaultPerson, buildRegistrationSchema, isPersonValid  } from "./registration-party";

// At most one person is ever being edited at a time; everyone else shows a read-only summary.
// The editingKey is either "registrant" or a companion's index, or null if no one is being edited.
type PersonKey = "registrant" | number;

export function RegistrationForm({ fieldsConfig, waiverConfig, initialOrder }: {
  fieldsConfig: FieldsConfig;
  waiverConfig: WaiverConfig;
  initialOrder: InitialOrder | null;
}) {
  // Default values for the RHF form: either the saved order's party or a new registrant with no companions.
  const defaultValues = initialOrder?.party ?? { registrant: buildDefaultPerson(fieldsConfig), companions: [] };

  const form = useForm<RegistrationParty>({
    defaultValues,
    resolver: zodResolver(buildRegistrationSchema(fieldsConfig)),
    mode: "onBlur",
  });

  const { fields: companions, append, remove } = useFieldArray({
    control: form.control,
    name: "companions"
  });

  const [editingKey, setEditingKey] = useState<PersonKey | null>(() => {
    if (!isPersonValid(fieldsConfig, defaultValues.registrant, 0)) return "registrant";
    const index = defaultValues.companions.findIndex((person) => !isPersonValid(fieldsConfig, person, 1));
    return index === -1 ? null : index;
  });

  const fieldStatePathFor = (key: PersonKey) => (key === "registrant" ? "registrant" : (`companions.${key}` as const));
  const titleFor = (key: PersonKey) => (key === "registrant" ? "You" : `Person ${key + 2}`);
  const modeFor = (key: PersonKey) => (editingKey === key ? "editing" : "summary");

  // Whoever is currently being edited must pass validation before freeing the slot for someone else.
  // Triggering the whole form validates everything and displays errors.
  // Fire-and-forget: both PersonCards' Save buttons just trigger the attempt, no caller needs the result.
  const handleSave = async () => {
    await form.trigger();
    if (form.getFieldState(fieldStatePathFor(editingKey!)).invalid) return false;
    setEditingKey(null);
    return true;
  };

  const addCompanion = () => {
    const newIndex = companions.length;
    append(buildDefaultPerson(fieldsConfig));
    setEditingKey(newIndex);
  };

  const removeCompanion = (index: number) => {
    remove(index);
    setEditingKey((key) => {
      if (key === "registrant" || key === null) return key;
      if (key === index) return null;
      return key > index ? key - 1 : key;
    });
  };

  // Field components take the loosest Control<FieldValues> b/c tenant active fields aren't known until runtime.
  const control = form.control as unknown as Control<FieldValues>;

  const fields = activeFields(fieldsConfig);

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
      <PersonCard
        control={control}
        namePrefix="registrant"
        fields={fields}
        isRegistrant
        title="You"
        mode={modeFor("registrant")}
        onEdit={editingKey === null ? () => setEditingKey("registrant") : undefined}
        onSave={handleSave}
      />
      {companions.map((field, index) => (
        <PersonCard
          key={field.id}
          control={control}
          namePrefix={`companions.${index}`}
          fields={fields.filter((field) => !field.firstPersonOnly)}
          isRegistrant={false}
          title={titleFor(index)}
          mode={modeFor(index)}
          onEdit={editingKey === null ? () => setEditingKey(index) : undefined}
          onSave={handleSave}
          onRemove={() => removeCompanion(index)}
        />
      ))}
      {editingKey === null ? (
        <Button type="button" variant="outline" onClick={addCompanion}>
          Add someone else
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">You&apos;ll be able to add more people once you save your information above.</p>
      )}
      {waiverConfig.show && <p>Waiver placeholder.</p>}
    </form>
  );
}
