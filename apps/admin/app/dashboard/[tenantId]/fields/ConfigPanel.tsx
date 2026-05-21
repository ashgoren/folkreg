"use client";

import { FIELD_DEFS } from "@repo/fields";
import type { FieldConfig } from "@repo/types";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { X, Plus } from "lucide-react";

interface ConfigPanelProps {
  fieldName: string;
  group: "contact" | "misc";
  config: FieldConfig;
  onChange: (updates: Partial<FieldConfig>) => void;
}

export function ConfigPanel({ fieldName, group, config, onChange }: ConfigPanelProps) {
  const def = FIELD_DEFS[fieldName];
  if (!def) return null;

  const showHeading = group === "misc";
  const showPlaceholder = def.type !== "radio" && def.type !== "checkbox";
  const showWidth = group === "contact";
  const showRows = def.type === "textarea";
  const showOptions = def.type === "radio" || def.type === "checkbox";

  return (
    <div className="border rounded-lg p-6 space-y-6 w-full max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="font-medium">{fieldName}</h2>
          <span className="text-xs bg-muted text-muted-foreground rounded px-1.5 py-0.5">{def.type}</span>
        </div>
        <div className="flex flex-col items-end gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Required</span>
            <Switch
              id={`config-required-${fieldName}`}
              checked={config.required ?? false}
              onCheckedChange={(checked) => onChange({ required: checked })}
            />
          </div>
          {showWidth && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Width</span>
              <input
                type="number"
                min={1}
                max={12}
                value={config.width ?? ""}
                onChange={(e) =>
                  onChange({ width: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                className="w-12 rounded border border-input bg-background px-1.5 py-0.5 text-sm text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          )}
          {showRows && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Rows</span>
              <input
                type="number"
                min={1}
                value={config.rows ?? ""}
                onChange={(e) =>
                  onChange({ rows: e.target.value === "" ? undefined : Number(e.target.value) })
                }
                className="w-12 rounded border border-input bg-background px-1.5 py-0.5 text-sm text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      <FieldGroup>
        {showHeading && (
          <Field>
            <FormLabel htmlFor={`config-title-${fieldName}`}>Heading</FormLabel>
            <Input
              id={`config-title-${fieldName}`}
              value={config.title ?? ""}
              onChange={(e) => onChange({ title: e.target.value })}
            />
          </Field>
        )}

        <Field>
          <FormLabel htmlFor={`config-label-${fieldName}`}>Label</FormLabel>
          {showHeading ? (
            <textarea
              id={`config-label-${fieldName}`}
              rows={3}
              value={config.label ?? ""}
              onChange={(e) => onChange({ label: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
            />
          ) : (
            <Input
              id={`config-label-${fieldName}`}
              value={config.label ?? ""}
              onChange={(e) => onChange({ label: e.target.value })}
            />
          )}
        </Field>

        {showPlaceholder && (
          <Field>
            <FormLabel htmlFor={`config-placeholder-${fieldName}`}>Placeholder</FormLabel>
            <Input
              id={`config-placeholder-${fieldName}`}
              value={config.placeholder ?? ""}
              onChange={(e) => onChange({ placeholder: e.target.value })}
            />
          </Field>
        )}

{showOptions && (
          <Field>
            <FormLabel>{def.type === "radio" ? "Radio options" : "Checkbox options"}</FormLabel>
            <div className="space-y-2 mt-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <span className="flex-3">Label</span>
                <span className="flex-1">Value</span>
                <span className="w-5" />
              </div>
              {(config.options ?? []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    className="flex-3"
                    value={opt.label}
                    onChange={(e) => {
                      const options = [...(config.options ?? [])];
                      options[i] = { label: e.target.value, value: opt.value };
                      onChange({ options });
                    }}
                  />
                  <Input
                    className="flex-1"
                    value={opt.value}
                    onChange={(e) => {
                      const options = [...(config.options ?? [])];
                      options[i] = { label: opt.label, value: e.target.value };
                      onChange({ options });
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const options = (config.options ?? []).filter((_, j) => j !== i);
                      onChange({ options });
                    }}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Remove option"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const options = [...(config.options ?? []), { label: "", value: "" }];
                  onChange({ options });
                }}
              >
                <Plus size={14} className="mr-1" />
                Add option
              </Button>
            </div>
          </Field>
        )}

        <Field>
          <FormLabel htmlFor={`config-default-${fieldName}`}>Default</FormLabel>
          {def.type === "checkbox" && (
            <p className="text-xs text-muted-foreground">Comma-separated option values</p>
          )}
          <Input
            id={`config-default-${fieldName}`}
            value={config.defaultValue ?? ""}
            onChange={(e) => onChange({ defaultValue: e.target.value || undefined })}
          />
        </Field>
      </FieldGroup>
    </div>
  );
}
