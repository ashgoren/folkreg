import { useWatch, type Control, type FieldValues } from "react-hook-form";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DynamicField } from "./fields/dynamic-field";
import type { FieldConfig } from "./fields/types";

type PersonCardMode = "summary" | "editing";

// A person has two mutually exclusive display states: summary or edit.
// Any number of people can be in summary at once but only one can ever be editing.
export function PersonCard({ control, namePrefix, fields, isRegistrant, title, mode, onEdit, onDone, onRemove }: {
  control: Control<FieldValues>;
  namePrefix: string; // "registrant" or "companions.${index}"
  fields: FieldConfig[]; // already filtered for this person (e.g. firstPersonOnly)
  isRegistrant: boolean;
  title: string; // e.g. "You" or "Person 2"
  mode: PersonCardMode;
  onEdit?: () => void; // omitted while someone else is already being edited
  onDone: () => void; // request to validate and stop editing this person
  onRemove?: () => void; // omitted for the registrant
}) {
  const first = useWatch({ control, name: `${namePrefix}.first` });
  const last = useWatch({ control, name: `${namePrefix}.last` });
  const name = [first, last].filter((part): part is string => typeof part === "string" && part.trim() !== "").join(" ");
  const label = name || title;

  if (mode === "editing") {
    return (
      <div role="group" aria-label={title} className="rounded-lg border p-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <p className="font-medium">{title}</p>
          {onRemove && (
            <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${label}`}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
        <div className="grid grid-cols-12 gap-4">
          {fields.map((field) => (
            <DynamicField
              key={field.name}
              control={control}
              name={`${namePrefix}.${field.name}`}
              fieldConfig={field}
              isRegistrant={isRegistrant}
            />
          ))}
        </div>
        <Button type="button" className="mt-4" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <div role="group" aria-label={title} className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex-1 font-medium">{label}</p>
        {onEdit && (
          <Button type="button" variant="ghost" size="icon" onClick={onEdit} aria-label={`Edit ${label}`}>
            <Pencil className="size-4" />
          </Button>
        )}
        {onRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${label}`}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">Summary coming soon.</p>
    </div>
  );
}
