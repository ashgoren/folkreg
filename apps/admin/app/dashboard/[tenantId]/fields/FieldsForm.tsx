"use client";

import { useState, useRef } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { FIELD_DEFS, FIELD_NAMES, type FieldName } from "@repo/fields";
import { defaultFieldConfig } from "@repo/tenant-config";
import { ChevronDown, ChevronUp } from "lucide-react";
import { isTextEntry } from "@/lib/text-entry";
import { useAutosave } from "@/lib/useAutosave";
import { AutosaveStatus } from "@/components/autosave-status";
import { FieldRow } from "./FieldRow";
import { ConfigPanel } from "./ConfigPanel";
import { updateFields } from "./actions";
import type { Tenant } from "@repo/types";
import type { FieldConfig, FieldsConfig } from "@repo/tenant-config";

// The page edits each section as an order of field names, with the fields' settings kept by name;
// fields_config stores each section as a list of entries (a name plus its settings). These convert
// when the page loads and when it saves.
type FieldsState = {
  contactOrder: FieldName[];
  miscOrder: FieldName[];
  config: Partial<Record<FieldName, FieldConfig>>;
};

const toState = (stored: FieldsConfig): FieldsState => ({
  contactOrder: stored.contact.map((field) => field.name),
  miscOrder: stored.misc.map((field) => field.name),
  config: Object.fromEntries([...stored.contact, ...stored.misc].map(({ name, ...settings }) => [name, settings])),
});

const toStored = (state: FieldsState): FieldsConfig => ({
  contact: state.contactOrder.map((name) => ({ name, ...state.config[name] })),
  misc: state.miscOrder.map((name) => ({ name, ...state.config[name] })),
});

export function FieldsForm({ tenant }: { tenant: Tenant }) {
  const initialFields = toState(tenant.fields_config);
  const [contactOrder, setContactOrder] = useState(initialFields.contactOrder);
  const [miscOrder, setMiscOrder] = useState(initialFields.miscOrder);
  const [config, setConfig] = useState(initialFields.config);

  // Mirrors state so callbacks always read the latest values
  const stateRef = useRef<FieldsState>({ contactOrder, miscOrder, config });

  const [selectedField, setSelectedField] = useState<FieldName | null>(null);

  // UI state
  const [contactOpen, setContactOpen] = useState(true);
  const [miscOpen, setMiscOpen] = useState(true);
  const [availableOpen, setAvailableOpen] = useState(true);

  const { save, isPending, savedRecently } = useAutosave<FieldsState>(
    (data) => updateFields(tenant.id, toStored(data)),
  );

  // A config panel edit typed into a text field, waiting to be saved when that field loses focus.
  // Same rule as the other config pages (see text-entry.ts): typing saves on blur, a click (the
  // Required switch, adding or removing an option) saves right away.
  const textEditPendingRef = useRef(false);

  function updateFieldConfig(fieldName: FieldName, updates: Partial<FieldConfig>) {
    const next = {
      ...stateRef.current.config,
      [fieldName]: { ...stateRef.current.config[fieldName], ...updates },
    };
    setConfig(next);
    stateRef.current = { ...stateRef.current, config: next };
    if (isTextEntry(document.activeElement)) textEditPendingRef.current = true;
    else save(stateRef.current);
  }

  // React's onBlur on the form fires when any field inside it loses focus.
  function saveTextEdit() {
    if (!textEditPendingRef.current) return;
    textEditPendingRef.current = false;
    save(stateRef.current);
  }

  function activateField(fieldName: FieldName) {
    const def = FIELD_DEFS[fieldName];
    const newConfig = {
      ...stateRef.current.config,
      [fieldName]: defaultFieldConfig(fieldName),
    };
    if (def.group === "contact") {
      const newContactOrder = [...stateRef.current.contactOrder, fieldName];
      setContactOrder(newContactOrder);
      stateRef.current = {
        ...stateRef.current,
        contactOrder: newContactOrder,
        config: newConfig,
      };
    } else {
      const newMiscOrder = [...stateRef.current.miscOrder, fieldName];
      setMiscOrder(newMiscOrder);
      stateRef.current = {
        ...stateRef.current,
        miscOrder: newMiscOrder,
        config: newConfig,
      };
    }
    setConfig(newConfig);
    save(stateRef.current);
  }

  function deactivateField(fieldName: FieldName) {
    const newContactOrder = stateRef.current.contactOrder.filter(
      (n) => n !== fieldName,
    );
    const newMiscOrder = stateRef.current.miscOrder.filter(
      (n) => n !== fieldName,
    );
    const newConfig = { ...stateRef.current.config };
    delete newConfig[fieldName];
    setContactOrder(newContactOrder);
    setMiscOrder(newMiscOrder);
    setConfig(newConfig);
    stateRef.current = {
      contactOrder: newContactOrder,
      miscOrder: newMiscOrder,
      config: newConfig,
    };
    if (selectedField === fieldName) setSelectedField(null);
    save(stateRef.current);
  }

  function needsOptions(fieldName: FieldName) {
    const type = FIELD_DEFS[fieldName].type;
    return type === "radio" || type === "checkbox";
  }

  function missingOptions(fieldName: FieldName) {
    const options = config[fieldName]?.options;
    return needsOptions(fieldName) && (!options || options.length === 0);
  }

  const activeNames = new Set([...contactOrder, ...miscOrder]);
  const availableFields = FIELD_NAMES.filter((name) => !activeNames.has(name));

  const selectedConfig = selectedField ? (config[selectedField] ?? null) : null;
  const selectedGroup: "contact" | "misc" | null = selectedField
    ? contactOrder.includes(selectedField)
      ? "contact"
      : "misc"
    : null;

  return (
    // autoComplete off stops the browser restoring unsaved field values on reload, which this page's state wouldn't know about.
    <form onSubmit={(e) => e.preventDefault()} onBlur={saveTextEdit} autoComplete="off" className="flex gap-8">
      {/* Left column: field lists */}
      <div className="w-72 shrink-0 flex flex-col gap-6">
        <div>
          <button
            type="button"
            onClick={() => setContactOpen((o) => !o)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 hover:text-foreground"
          >
            {contactOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Contact
          </button>
          {contactOpen && (
            <DragDropProvider
              onDragEnd={(event) => {
                if (event.canceled) return;
                const newOrder = move(contactOrder, event) as FieldName[];
                setContactOrder(newOrder);
                stateRef.current = {
                  ...stateRef.current,
                  contactOrder: newOrder,
                };
                save(stateRef.current);
              }}
            >
              <div className="flex flex-col gap-1">
                {contactOrder.map((name, index) => (
                  <FieldRow
                    key={name}
                    name={name}
                    config={config[name]!}
                    index={index}
                    isSelected={selectedField === name}
                    hasWarning={missingOptions(name)}
                    onSelect={() => setSelectedField(name)}
                    onDeactivate={() => deactivateField(name)}
                  />
                ))}
              </div>
            </DragDropProvider>
          )}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setMiscOpen((o) => !o)}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 hover:text-foreground"
          >
            {miscOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Misc
          </button>
          {miscOpen && (
            <DragDropProvider
              onDragEnd={(event) => {
                if (event.canceled) return;
                const newOrder = move(miscOrder, event) as FieldName[];
                setMiscOrder(newOrder);
                stateRef.current = {
                  ...stateRef.current,
                  miscOrder: newOrder,
                };
                save(stateRef.current);
              }}
            >
              <div className="flex flex-col gap-1">
                {miscOrder.map((name, index) => (
                  <FieldRow
                    key={name}
                    name={name}
                    config={config[name]!}
                    index={index}
                    isSelected={selectedField === name}
                    hasWarning={missingOptions(name)}
                    onSelect={() => setSelectedField(name)}
                    onDeactivate={() => deactivateField(name)}
                  />
                ))}
              </div>
            </DragDropProvider>
          )}
        </div>

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
        {selectedField && selectedConfig && selectedGroup ? (
          <ConfigPanel
            fieldName={selectedField}
            group={selectedGroup}
            config={selectedConfig}
            onChange={(updates) => updateFieldConfig(selectedField, updates)}
          />
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
