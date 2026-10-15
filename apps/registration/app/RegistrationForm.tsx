"use client";

import type { FieldsConfig, WaiverConfig } from "@repo/tenant-config";
import type { RegistrationParty } from "./registration-party";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, type Control, type FieldValues } from "react-hook-form";
import { PersonCard } from "@/components/person-card";
import { readDraftParty, writeDraftParty } from "@/lib/draft-storage";
import { activeFields, buildDefaultPerson, buildRegistrationSchema, isPersonValid } from "./registration-party";

// At most one person is ever being edited at a time; everyone else shows a read-only summary.
// The editingKey is either "registrant" or a companion's index, or null if no one is being edited.
type PersonKey = "registrant" | number;

// Which person's card starts open for a party: the first one who isn't valid yet, or no one.
const firstPersonToEdit = (fieldsConfig: FieldsConfig, party: RegistrationParty): PersonKey | null => {
  if (!isPersonValid(fieldsConfig, party.registrant, 0)) return "registrant";
  const index = party.companions.findIndex((person) => !isPersonValid(fieldsConfig, person, 1));
  return index === -1 ? null : index;
};

export function RegistrationForm({ fieldsConfig, waiverConfig }: { fieldsConfig: FieldsConfig; waiverConfig: WaiverConfig }) {
  // Always starts as a blank party, so the server can render the form and every registrant sees it immediately.
  // A draft from this tab is restored after mount (below). Accepting the risk of re-render flash in case of a saved draft.
  const form = useForm<RegistrationParty>({
    defaultValues: { registrant: buildDefaultPerson(fieldsConfig), companions: [] },
    resolver: zodResolver(buildRegistrationSchema(fieldsConfig)),
    mode: "onBlur",
  });

  const { fields: companions, append, remove } = useFieldArray({
    control: form.control,
    name: "companions"
  });

  const [editingKey, setEditingKey] = useState<PersonKey | null>("registrant");

  // Restore this tab's draft from sessionStorage (client only), then save every change to it. Read before subscribe
  // keeps a write from replacing the draft before it's restored and prevents the restore itself from being written back.
  useEffect(() => {
    const draft = readDraftParty();
    if (draft) {
      form.reset(draft);
      setEditingKey(firstPersonToEdit(fieldsConfig, draft));
    }
    // form.watch callback form to prevent re-renders
    const subscription = form.watch(() => writeDraftParty(form.getValues()));
    return () => subscription.unsubscribe();
  }, [form, fieldsConfig]);

  const fieldStatePathFor = (key: PersonKey) => (key === "registrant" ? "registrant" : (`companions.${key}` as const));
  const titleFor = (key: PersonKey) => (key === "registrant" ? "You" : `Person ${key + 2}`);
  const modeFor = (key: PersonKey) => (editingKey === key ? "editing" : "summary");

  // Fire-and-forget: trigger validation, and if the person passes, clear the editingKey to show their summary instead of the form.
  const finishEditing = async () => {
    await form.trigger();
    if (form.getFieldState(fieldStatePathFor(editingKey!)).invalid) return;
    setEditingKey(null);
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
        onDone={finishEditing}
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
          onDone={finishEditing}
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
