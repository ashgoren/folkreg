"use client";

import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { DragDropProvider } from "@dnd-kit/react";
import { move as reorder } from "@dnd-kit/helpers";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import type { AdmissionsConfig } from "@repo/tenant-config";
import { TieredCategoryCard } from "./TieredCategoryCard";

// One of the tenant's age brackets: an option of its age field.
export type AgeOption = { label: string; value: string };

export function TieredCategories({ form, ageOptions }: {
  form: UseFormReturn<AdmissionsConfig>;
  /** null when the age field isn't active. */
  ageOptions: AgeOption[] | null;
}) {
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "categories" });

  return (
    <div className="space-y-3">
      <FieldDescription>
        Pricing categories (e.g. Basic, Sustaining, Benefactor) each registrant can choose from. Assign the age groups
        it applies to, and set separate early-bird and regular prices. Drag to reorder — this controls the order
        registrants see prices in at checkout, for any age group with more than one applicable category.
      </FieldDescription>

      {/* Each registrant is priced by their answer to the age field, so without it there's nothing to price by. */}
      {ageOptions === null ? (
        <p className="text-sm text-amber-600">Add the age field on the Fields page: its options are the age groups priced here.</p>
      ) : ageOptions.length === 0 && (
        <p className="text-sm text-amber-600">The age field has no options yet. Add them on the Fields page: they&apos;re the age groups priced here.</p>
      )}

      {fields.length > 0 && (
        <DragDropProvider
          onDragEnd={(event) => {
            if (event.canceled || !event.operation.source) return;
            const sourceId = event.operation.source.id;
            const ids = fields.map((f) => f.id);
            const reordered = reorder(ids, event) as string[];
            const from = ids.indexOf(sourceId as string);
            const to = reordered.indexOf(sourceId as string);
            if (from !== -1 && to !== -1 && from !== to) move(from, to);
          }}
        >
          <div className="space-y-3">
            {fields.map((field, index) => (
              <TieredCategoryCard
                key={field.id}
                form={form}
                fieldId={field.id}
                index={index}
                ageOptions={ageOptions ?? []}
                onRemove={() => remove(index)}
              />
            ))}
          </div>
        </DragDropProvider>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ label: "", ageGroups: [], early: 0, later: 0 })}
      >
        <Plus size={14} className="mr-1" />
        Add category
      </Button>
    </div>
  );
}
