"use client";

import { useState, useTransition } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { FIELD_DEFS } from "@repo/fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { FieldRow } from "./FieldRow";
import { ConfigPanel } from "./ConfigPanel";
import { updateFields } from "./actions";
import type { FieldConfig, Tenant } from "@repo/types";

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

export function FieldsForm({ tenant, tenantId }: { tenant: Tenant; tenantId: string }) {
  // Load initial fields config from db and keep it in local state until user saves
  const initialFields = tenant.registration_config?.fields;
  const [contactOrder, setContactOrder] = useState<string[]>(initialFields?.contactOrder ?? []);
  const [miscOrder, setMiscOrder] = useState<string[]>(initialFields?.miscOrder ?? []);
  const [config, setConfig] = useState<Record<string, FieldConfig>>(initialFields?.config ?? {});

  const [selectedField, setSelectedField] = useState<string | null>(null);

  const [contactOpen, setContactOpen] = useState(true);
  const [miscOpen, setMiscOpen] = useState(true);
  const [availableOpen, setAvailableOpen] = useState(contactOrder.length === 0 && miscOrder.length === 0);

  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateFieldConfig(fieldName: string, updates: Partial<FieldConfig>) {
    setConfig((prev) => ({ ...prev, [fieldName]: { ...prev[fieldName], ...updates } }));
    setIsDirty(true);
  }

  function activateField(fieldName: string) {
    const def = FIELD_DEFS[fieldName];
    if (def!.group === "contact") {
      setContactOrder((prev) => [...prev, fieldName]);
    } else {
      setMiscOrder((prev) => [...prev, fieldName]);
    }
    setConfig((prev) => ({ ...prev, [fieldName]: getDefaultConfig(fieldName) }));
    setIsDirty(true);
  }

  function deactivateField(fieldName: string) {
    setContactOrder((prev) => prev.filter((n) => n !== fieldName));
    setMiscOrder((prev) => prev.filter((n) => n !== fieldName));
    setConfig((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
    if (selectedField === fieldName) setSelectedField(null);
    setIsDirty(true);
  }

  function handleSave() {
    setSaveError(null);
    setSaved(false);
    startTransition(async () => {
      const error = await updateFields(tenantId, { contactOrder, miscOrder, config });
      if (error) {
        setSaveError(error);
      } else {
        setIsDirty(false);
        setSaved(true);
      }
    });
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
  const availableFields = Object.entries(FIELD_DEFS).filter(([name]) => !activeNames.has(name));

  const selectedConfig = selectedField ? config[selectedField] ?? null : null;
  const selectedGroup: "contact" | "misc" | null = selectedField
    ? (contactOrder.includes(selectedField) ? "contact" : "misc")
    : null;

  return (
    <div className="flex gap-8">
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
                setContactOrder((prev) => move(prev, event) as string[]);
                setIsDirty(true);
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
                setMiscOrder((prev) => move(prev, event) as string[]);
                setIsDirty(true);
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
              {availableOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
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

        <div className="flex items-center gap-4">
          <Button type="button" onClick={handleSave} disabled={isPending || !isDirty}>
            {isPending ? "Saving…" : "Save"}
          </Button>
          {saved && <span className="text-sm text-muted-foreground">Saved ✓</span>}
        </div>

        {saveError && (
          <Alert variant="destructive">
            <AlertDescription>{saveError}</AlertDescription>
          </Alert>
        )}
      </div>

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
    </div>
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
