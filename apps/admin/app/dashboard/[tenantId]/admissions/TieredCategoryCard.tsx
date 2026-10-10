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
import type { AdmissionsConfig } from "@repo/tenant-config";
import type { AgeOption } from "./TieredCategories";

export function TieredCategoryCard({
  form,
  fieldId,
  index,
  ageOptions,
  onRemove,
}: {
  form: UseFormReturn<AdmissionsConfig>;
  fieldId: string;
  index: number;
  ageOptions: AgeOption[];
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
        render={({ field: ageGroupsField }) => {
          // A value can outlive its age option (renamed or removed on the Fields page). It's still
          // listed, so the category's pointing at it is visible and can be unchecked.
          const known = new Set(ageOptions.map((option) => option.value));
          const groups = [
            ...ageOptions.map((option) => ({ value: option.value, label: option.label || option.value })),
            ...ageGroupsField.value.filter((value) => !known.has(value)).map((value) => ({ value, label: `${value} (not an age option)` })),
          ];
          return (
            <Field>
              <FormLabel>Which age groups should this category apply to?</FormLabel>
              <div className="flex flex-wrap gap-4">
                {groups.map((group, i) => (
                  <label key={i} className="flex items-center gap-1.5 text-sm">
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
          );
        }}
      />
    </div>
  );
}
