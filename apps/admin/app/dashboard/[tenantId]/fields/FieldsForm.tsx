"use client";

import { useState, useRef } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { FIELD_DEFS } from "@repo/fields";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAutosave } from "@/lib/useAutosave";
import { AutosaveStatus } from "@/components/autosave-status";
import { FieldRow } from "./FieldRow";
import { ConfigPanel } from "./ConfigPanel";
import { updateFields } from "./actions";
import type { FieldConfig, Tenant } from "@repo/types";

type FieldsState = {
  contactOrder: string[];
  miscOrder: string[];
  config: Record<string, FieldConfig>;
};

function getDefaultConfig(fieldName: string): FieldConfig {
  const def = FIELD_DEFS[fieldName];
  if (!def) throw new Error(`Unknown field: ${fieldName}`);
  const d = def.defaults ?? {};
  return {
    ...(d.label && { label: d.label }),
    ...(d.title && { title: d.title }),
    ...(d.placeholder && { placeholder: d.placeholder }),
    ...(d.width !== undefined && { width: d.width }),
    ...(d.rows !== undefined && { rows: d.rows }),
    ...(d.options && { options: d.options }),
    ...(d.value !== undefined && { defaultValue: d.value }),
  };
}

export function FieldsForm({ tenant }: { tenant: Tenant }) {
  // Load initial fields config from db and keep it in local state until user saves
  const initialFields = tenant.fields_config;
  const [contactOrder, setContactOrder] = useState<string[]>(
    initialFields?.contactOrder ?? [],
  );
  const [miscOrder, setMiscOrder] = useState<string[]>(
    initialFields?.miscOrder ?? [],
  );
  const [config, setConfig] = useState<Record<string, FieldConfig>>(
    initialFields?.config ?? {},
  );

  // Mirrors state so callbacks always read the latest values
  const stateRef = useRef<FieldsState>({ contactOrder, miscOrder, config });

  const [selectedField, setSelectedField] = useState<string | null>(null);

  // UI state
  const [contactOpen, setContactOpen] = useState(true);
  const [miscOpen, setMiscOpen] = useState(true);
  const [availableOpen, setAvailableOpen] = useState(
    contactOrder.length === 0 && miscOrder.length === 0,
  );

  const { saveNow, saveDebounced, isPending, savedRecently } = useAutosave<FieldsState>(
    (data) => updateFields(tenant.id, data),
  );

  function updateFieldConfig(fieldName: string, updates: Partial<FieldConfig>) {
    const next = {
      ...stateRef.current.config,
      [fieldName]: { ...stateRef.current.config[fieldName], ...updates },
    };
    setConfig(next);
    stateRef.current = { ...stateRef.current, config: next };
    saveDebounced(stateRef.current);
  }

  function activateField(fieldName: string) {
    const def = FIELD_DEFS[fieldName];
    const newConfig = {
      ...stateRef.current.config,
      [fieldName]: getDefaultConfig(fieldName),
    };
    if (def!.group === "contact") {
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
    saveNow(stateRef.current);
  }

  function deactivateField(fieldName: string) {
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
    saveNow(stateRef.current);
  }

  function needsOptions(fieldName: string) {
    const type = FIELD_DEFS[fieldName]?.type;
    return type === "radio" || type === "checkbox";
  }

  function missingOptions(fieldName: string) {
    const options = config[fieldName]?.options;
    return needsOptions(fieldName) && (!options || options.length === 0);
  }

  const activeNames = new Set([...contactOrder, ...miscOrder]);
  const availableFields = Object.entries(FIELD_DEFS).filter(
    ([name]) => !activeNames.has(name),
  );

  const selectedConfig = selectedField ? (config[selectedField] ?? null) : null;
  const selectedGroup: "contact" | "misc" | null = selectedField
    ? contactOrder.includes(selectedField)
      ? "contact"
      : "misc"
    : null;

  return (
    <form onSubmit={(e) => e.preventDefault()} className="flex gap-8">
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
                const newOrder = move(contactOrder, event) as string[];
                setContactOrder(newOrder);
                stateRef.current = {
                  ...stateRef.current,
                  contactOrder: newOrder,
                };
                saveNow(stateRef.current);
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
                const newOrder = move(miscOrder, event) as string[];
                setMiscOrder(newOrder);
                stateRef.current = {
                  ...stateRef.current,
                  miscOrder: newOrder,
                };
                saveNow(stateRef.current);
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
                {availableFields.map(([name]) => (
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
    <div className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-muted/50">
      <span>{fieldName}</span>
      <button
        type="button"
        onClick={onActivate}
        className="text-xs text-primary hover:underline ml-2 shrink-0"
      >
        Add
      </button>
    </div>
  );
}
