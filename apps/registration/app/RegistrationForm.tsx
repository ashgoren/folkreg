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

export function RegistrationForm({ fieldsConfig, waiverConfig }: { fieldsConfig: FieldsConfig; waiverConfig: WaiverConfig }) {
  // The draft lives in sessionStorage, not server-side, so don't render until the component is mounted on the client.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  if (!isClient) return null;

  return (
    <PartyForm
      fieldsConfig={fieldsConfig}
      waiverConfig={waiverConfig}
      initialParty={readDraftParty()}
    />
  );
}

function PartyForm({ fieldsConfig, waiverConfig, initialParty }: {
  fieldsConfig: FieldsConfig;
  waiverConfig: WaiverConfig;
  initialParty: RegistrationParty | null;
}) {
  // Default values for the RHF form: either this tab's draft or a new registrant with no companions.
  const defaultValues = initialParty ?? { registrant: buildDefaultPerson(fieldsConfig), companions: [] };

  const form = useForm<RegistrationParty>({
    defaultValues,
    resolver: zodResolver(buildRegistrationSchema(fieldsConfig)),
    mode: "onBlur",
  });

  const { fields: companions, append, remove } = useFieldArray({
    control: form.control,
    name: "companions"
  });

  // Save to sessionStorage on every change. (Note: drafts aren't validated.)
  // form.watch's callback form is a subscription, so this doesn't cause re-renders.
  useEffect(() => {
    const subscription = form.watch(() => writeDraftParty(form.getValues()));
    return () => subscription.unsubscribe();
  }, [form]);

  const [editingKey, setEditingKey] = useState<PersonKey | null>(() => {
    if (!isPersonValid(fieldsConfig, defaultValues.registrant, 0)) return "registrant";
    const index = defaultValues.companions.findIndex((person) => !isPersonValid(fieldsConfig, person, 1));
    return index === -1 ? null : index;
  });

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
