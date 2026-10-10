"use client";

import { useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { FIELD_DEFS, FIELD_NAMES, type FieldName } from "@repo/fields";
import { defaultFieldEntry, fieldsConfigSchema, type FieldEntry } from "@repo/tenant-config";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import { AutosaveStatus } from "@/components/autosave-status";
import { FieldRow } from "./FieldRow";
import { ConfigPanel, type FieldEntryPath } from "./ConfigPanel";
import { updateFields } from "./actions";
import type { Tenant } from "@repo/types";

const GROUPS = [
  { group: "contact", title: "Contact" },
  { group: "misc", title: "Misc" },
] as const;

type Group = (typeof GROUPS)[number]["group"];

// A radio or checkbox field with nothing to choose from: allowed (an organizer may add the field
// before writing its options), but flagged in the list.
const missingOptions = (entry: FieldEntry) => {
  const type = FIELD_DEFS[entry.name].type;
  return (type === "radio" || type === "checkbox") && !entry.options?.length;
};

export function FieldsForm({ tenant }: { tenant: Tenant }) {
  const { form, formProps, isPending, savedRecently } = useAutosaveForm({
    label: "Fields",
    schema: fieldsConfigSchema,
    defaultValues: tenant.fields_config,
    save: (data) => updateFields(tenant.id, data),
  });

  // Each group is its own list in the form's values. These only add, remove and reorder entries;
  // useAutosaveForm sees each change and saves it, like any other edit.
  const fieldArrays = {
    contact: useFieldArray({ control: form.control, name: "contact" }),
    misc: useFieldArray({ control: form.control, name: "misc" }),
  };
  const [contact, misc] = useWatch({ control: form.control, name: ["contact", "misc"] });
  const entries: Record<Group, FieldEntry[]> = { contact, misc };

  // Which field the config panel shows. UI state, not form data, so it's kept by name, and its
  // place in the form's values worked out on each render: a drag or a removal above it moves it.
  const [selectedField, setSelectedField] = useState<FieldName | null>(null);
  const pathOf = (name: FieldName): FieldEntryPath | null => {
    const group = FIELD_DEFS[name].group;
    const index = entries[group].findIndex((entry) => entry.name === name);
    return index === -1 ? null : `${group}.${index}`;
  };
  const selectedPath = selectedField && pathOf(selectedField);

  // UI state
  const [open, setOpen] = useState<Record<Group, boolean>>({ contact: true, misc: true });
  const [availableOpen, setAvailableOpen] = useState(true);

  // Switching to another field would hide the open panel's errors while they still block every
  // save, with nothing on screen to say why. So the switch waits until the open field is valid,
  // and otherwise leaves its errors showing.
  async function selectField(name: FieldName) {
    if (selectedPath && !(await form.trigger(selectedPath))) return;
    setSelectedField(name);
  }

  function activateField(name: FieldName) {
    fieldArrays[FIELD_DEFS[name].group].append(defaultFieldEntry(name));
  }

  function deactivateField(name: FieldName) {
    if (selectedField === name) setSelectedField(null);
    const group = FIELD_DEFS[name].group;
    fieldArrays[group].remove(entries[group].findIndex((entry) => entry.name === name));
  }

  const activeNames = new Set([...contact, ...misc].map((entry) => entry.name));
  const availableFields = FIELD_NAMES.filter((name) => !activeNames.has(name));

  return (
    <form {...formProps} className="flex gap-8">
      {/* Left column: field lists */}
      <div className="w-72 shrink-0 flex flex-col gap-6">
        {GROUPS.map(({ group, title }) => (
          <div key={group}>
            <button
              type="button"
              onClick={() => setOpen((o) => ({ ...o, [group]: !o[group] }))}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 hover:text-foreground"
            >
              {open[group] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {title}
            </button>
            {open[group] && (
              <DragDropProvider
                onDragEnd={(event) => {
                  const { source } = event.operation;
                  if (event.canceled || !isSortable(source) || source.initialIndex === source.index) return;
                  fieldArrays[group].move(source.initialIndex, source.index);
                }}
              >
                <div className="flex flex-col gap-1">
                  {entries[group].map((entry, index) => (
                    <FieldRow
                      key={entry.name}
                      name={entry.name}
                      required={entry.required ?? false}
                      index={index}
                      isSelected={selectedField === entry.name}
                      hasWarning={missingOptions(entry)}
                      onSelect={() => void selectField(entry.name)}
                      onDeactivate={() => deactivateField(entry.name)}
                    />
                  ))}
                </div>
              </DragDropProvider>
            )}
          </div>
        ))}

        {availableFields.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setAvailableOpen((o) => !o)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              {availableOpen ? (
                <ChevronUp size={14} />
              ) : (
                <ChevronDown size={14} />
              )}
              Available fields
            </button>
            {availableOpen && (
              <div className="mt-2 flex flex-col gap-0.5 opacity-70">
                {availableFields.map((name) => (
                  <AvailableFieldRow
                    key={name}
                    fieldName={name}
                    onActivate={() => activateField(name)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />

      {/* Right column: config panel */}
      <div className="flex-1 min-w-0">
        {selectedField && selectedPath ? (
          // Keyed by path as well as name: a drag can move the selected field to a new index, and
          // the panel's controls are bound to paths, so it starts fresh at the new one.
          <ConfigPanel key={`${selectedField}@${selectedPath}`} form={form} path={selectedPath} fieldName={selectedField} />
        ) : (
          <p className="text-sm text-muted-foreground italic mt-1">
            Select a field to configure it.
          </p>
        )}
      </div>
    </form>
  );
}

function AvailableFieldRow({
  fieldName,
  onActivate,
}: {
  fieldName: string;
  onActivate: () => void;
}) {
  return (
    <div data-available-field={fieldName} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50">
      <span className="min-w-0 flex-1 truncate">{fieldName}</span>
      <button
        type="button"
        onClick={onActivate}
        className="text-xs text-primary hover:underline shrink-0"
      >
        Add
      </button>
    </div>
  );
}
