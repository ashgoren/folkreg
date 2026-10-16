"use client";

import type { FieldsConfig, WaiverConfig } from "@repo/tenant-config";
import type { RegistrationParty } from "./registration-party";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, type Control, type FieldValues } from "react-hook-form";
import { PersonCard } from "@/components/person-card";
import { readDraftParty, writeDraftParty } from "@/lib/draft-storage";
import { activeFieldGroups, buildDefaultPerson, buildRegistrationSchema, isPersonValid } from "./registration-party";
import { submitRegistration } from "./actions";

// At most one person is ever being edited at a time; everyone else shows a read-only summary.
// The editingKey is either "registrant" or a companion's index, or null if no one is being edited.
type PersonKey = "registrant" | number;

// The party's invalid person, or null if everyone is valid. A card only closes while its person is
// valid, so there's at most one: the person who was being edited. Used to reopen card on draft restore.
const findInvalidPerson = (fieldsConfig: FieldsConfig, party: RegistrationParty): PersonKey | null => {
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
      setEditingKey(findInvalidPerson(fieldsConfig, draft));
    }
    // form.watch callback form to prevent re-renders
    const subscription = form.watch(() => writeDraftParty(form.getValues()));
    return () => subscription.unsubscribe();
  }, [form, fieldsConfig]);

  const fieldStatePathFor = (key: PersonKey) => (key === "registrant" ? "registrant" : (`companions.${key}` as const));
  const titleFor = (key: PersonKey) => (key === "registrant" ? "You" : `Person ${key + 2}`);
  const modeFor = (key: PersonKey) => (editingKey === key ? "editing" : "summary");

  // Any change to the party (edit/add/remove) clears this message.
  const [submitError, setSubmitError] = useState<string | null>(null);

  const startEditing = (key: PersonKey) => {
    setSubmitError(null);
    setEditingKey(key);
  };

  // Fire-and-forget: trigger validation, and if the person passes, clear the editingKey to show their summary instead of the form.
  const finishEditing = async () => {
    await form.trigger();
    if (form.getFieldState(fieldStatePathFor(editingKey!)).invalid) return;
    setEditingKey(null);
  };

  const addCompanion = () => {
    const newIndex = companions.length;
    append(buildDefaultPerson(fieldsConfig));
    startEditing(newIndex);
  };

  const removeCompanion = (index: number) => {
    setSubmitError(null);
    remove(index);
    setEditingKey((key) => {
      if (key === "registrant" || key === null) return key;
      if (key === index) return null;
      return key > index ? key - 1 : key;
    });
  };

  const [isSubmitting, startSubmitting] = useTransition();

  // handleSubmit re-validates and only calls this if it passes, with the values the schema parsed.
  // Continue only shows while every card is closed, and a card only closes while its person is valid, but
  // the server re-validates, creates the order, and redirects; it only returns when there's an error to show.
  // useTransition keeps isSubmitting true for the server round trip, so the button can't be clicked twice;
  // on success, Next's redirect boundary then swaps the form out for the next page.
  const submit = form.handleSubmit((party) =>
    startSubmitting(async () => {
      setSubmitError(null);
      const { error } = await submitRegistration(party);
      setSubmitError(error); // only reached on failure (successful submit redirects)
    })
  );

  // Field components take the loosest Control<FieldValues> b/c tenant active fields aren't known until runtime.
  const control = form.control as unknown as Control<FieldValues>;

  const fields = activeFieldGroups(fieldsConfig);
  // Companions don't get the registrant-only fields (the agreement).
  const companionFields = {
    contact: fields.contact.filter((field) => !field.firstPersonOnly),
    misc: fields.misc.filter((field) => !field.firstPersonOnly),
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-6">
      <PersonCard
        control={control}
        namePrefix="registrant"
        fields={fields}
        isRegistrant
        title="You"
        mode={modeFor("registrant")}
        onEdit={editingKey === null ? () => startEditing("registrant") : undefined}
        onDone={finishEditing}
      />
      {companions.map((field, index) => (
        <PersonCard
          key={field.id}
          control={control}
          namePrefix={`companions.${index}`}
          fields={companionFields}
          isRegistrant={false}
          title={titleFor(index)}
          mode={modeFor(index)}
          onEdit={editingKey === null ? () => startEditing(index) : undefined}
          onDone={finishEditing}
          onRemove={() => removeCompanion(index)}
        />
      ))}
      {editingKey === null ? (
        <Button type="button" variant="outline" onClick={addCompanion}>
          Add someone else
        </Button>
      ) : (
        <p className="text-muted-foreground">You&apos;ll be able to add more people once you save your information above.</p>
      )}

      {waiverConfig.show && <p>Waiver placeholder.</p>}

      {editingKey === null && (
        <>
          {submitError && (
            <p role="alert" className="text-destructive">
              {submitError}
            </p>
          )}
          <Button type="button" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting…" : "Continue"}
          </Button>
        </>
      )}
    </form>
  );
}
