"use client";

import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { DragDropProvider } from "@dnd-kit/react";
import { move as reorder } from "@dnd-kit/helpers";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldDescription } from "@/components/ui/field";
import type { AdmissionsValues } from "./schema";
import { TieredCategoryCard } from "./TieredCategoryCard";

export function TieredCategories({ form }: { form: UseFormReturn<AdmissionsValues> }) {
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "categories" });

  return (
    <div className="space-y-3">
      <FieldDescription>
        Pricing categories (e.g. Basic, Sustaining, Benefactor) each registrant can choose from. Assign the age groups
        it applies to, and set separate early-bird and regular prices. Drag to reorder — this controls the order
        registrants see prices in at checkout, for any age group with more than one applicable category.
      </FieldDescription>

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
