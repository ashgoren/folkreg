"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { NumberField } from "@/components/form-number-field";
import { TextField } from "@/components/form-text-field";
import { cn } from "@/lib/utils";
import type { AgeGroup } from "@repo/types";
import type { AdmissionsValues } from "./schema";

const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: "0-2", label: "0-2 yr old" },
  { value: "3-5", label: "3-5 yr old" },
  { value: "6-12", label: "6-12 yr old" },
  { value: "13-17", label: "13-17 yr old" },
  { value: "adult", label: "Adult" },
];

export function TieredCategoryCard({
  form,
  fieldId,
  index,
  onRemove,
}: {
  form: UseFormReturn<AdmissionsValues>;
  fieldId: string;
  index: number;
  onRemove: () => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({ id: fieldId, index });

  return (
    <div ref={ref} className={cn("rounded border border-border p-3 space-y-3", isDragging && "opacity-50 shadow-lg z-10")}>
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          ref={handleRef}
          className="mt-6 p-1.5 cursor-grab text-muted-foreground hover:text-foreground focus:outline-none"
          tabIndex={-1}
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>

        <div className="flex-1">
          <TextField
            control={form.control}
            name={`categories.${index}.label`}
            id={`admissions-category-label-${index}`}
            label="Label (e.g. Basic, Sustaining, Benefactor)"
            autoComplete="off"
          />
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="mt-6 p-1.5 text-muted-foreground hover:text-destructive"
          aria-label="Remove category"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <NumberField
            control={form.control}
            name={`categories.${index}.early`}
            id={`admissions-category-early-${index}`}
            label="Early-bird price"
          />
        </div>

        <div className="flex-1">
          <NumberField
            control={form.control}
            name={`categories.${index}.later`}
            id={`admissions-category-later-${index}`}
            label="Regular price"
          />
        </div>
      </div>

      <Controller
        name={`categories.${index}.ageGroups`}
        control={form.control}
        render={({ field: ageGroupsField }) => (
          <Field>
            <FormLabel>Which age groups should this category apply to?</FormLabel>
            <div className="flex flex-wrap gap-4">
              {AGE_GROUPS.map((group) => (
                <label key={group.value} className="flex items-center gap-1.5 text-sm">
                  <Checkbox
                    checked={ageGroupsField.value.includes(group.value)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...ageGroupsField.value, group.value]
                        : ageGroupsField.value.filter((g) => g !== group.value);
                      ageGroupsField.onChange(next);
                    }}
                  />
                  {group.label}
                </label>
              ))}
            </div>
          </Field>
        )}
      />
    </div>
  );
}
