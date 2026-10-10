"use client";

import { Controller, useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { priceAfterCutoff, type AdmissionsConfig } from "@repo/tenant-config";

// One of the tenant's age brackets: an option of its age field.
export type AgeOption = { label: string; value: string };

type Form = UseFormReturn<AdmissionsConfig>;

/**
 * Tiered prices, one section per age group in the age field's order, each listing the prices
 * someone that age chooses between. An age group can have no entry in `tiered.prices` yet; its section
 * offers to add the first price. Prices kept for a value that's no longer an age option (renamed
 * or removed on the Fields page) get a section of their own, so they can be seen and removed.
 */
export function TieredPrices({ form, ageOptions }: {
  form: Form;
  /** null when the age field isn't active. */
  ageOptions: AgeOption[] | null;
}) {
  // Adds and removes whole age groups; each group's own list is edited in AgeGroupPrices.
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "tiered.prices" });
  const prices = useWatch({ control: form.control, name: "tiered.prices" });

  // Each registrant is priced by their answer to the age field, so without it there's nothing to
  // price by. Prices already entered are kept (and shown again once the field is back).
  if (ageOptions === null) {
    return <p className="text-sm text-amber-600">Add the age field on the Fields page: its options are the age groups priced here.</p>;
  }

  const isAgeOption = new Set(ageOptions.map((option) => option.value));
  // The section for prices[index]. Keyed by its entry's id and position: its inputs are bound to
  // paths by index, so it starts fresh if a removal above it moves it.
  const section = (index: number, title: string, onRemoveGroup?: () => void) => (
    <AgeGroupPrices key={`${fields[index]?.id}@${index}`} form={form} index={index} title={title} onRemoveGroup={onRemoveGroup} />
  );

  return (
    <div className="space-y-5">
      <FieldDescription>
        The prices registrants choose from, by age group, in the order they see them (drag to reorder). Several
        prices for one age group are told apart by their labels; a lone price can go without one.
      </FieldDescription>

      {ageOptions.length === 0 && (
        <p className="text-sm text-amber-600">The age field has no options yet. Add them on the Fields page.</p>
      )}

      {ageOptions.map((option) => {
        const title = option.label || option.value;
        const index = prices.findIndex((entry) => entry.ageGroup === option.value);
        if (index !== -1) return section(index, title);
        return (
          <AgeGroupSection key={option.value} title={title}>
            <NoPriceYet />
            <AddPriceButton title={title} onClick={() => append({ ageGroup: option.value, options: [{ label: "", price: 0 }] })} />
          </AgeGroupSection>
        );
      })}

      {prices.map((entry, index) => (isAgeOption.has(entry.ageGroup)
        ? null
        : section(index, `${entry.ageGroup} (not an age option)`, () => remove(index))))}
    </div>
  );
}

function AgeGroupSection({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const NoPriceYet = () => (
  <p className="text-sm text-amber-600">No price yet: registrants of this age can&apos;t be priced.</p>
);

const AddPriceButton = ({ title, onClick }: { title: string; onClick: () => void }) => (
  <Button type="button" variant="ghost" size="sm" onClick={onClick} aria-label={`Add a price for ${title}`} className="text-muted-foreground">
    <Plus size={14} className="mr-1" />
    Add price
  </Button>
);

// One age group's prices, reorderable within the group.
function AgeGroupPrices({ form, index, title, onRemoveGroup }: {
  form: Form;
  index: number;
  title: string;
  /** For prices kept under a value that's no longer an age option. */
  onRemoveGroup?: () => void;
}) {
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: `tiered.prices.${index}.options` });

  return (
    <AgeGroupSection
      title={title}
      action={onRemoveGroup && (
        <Button type="button" variant="ghost" size="sm" onClick={onRemoveGroup} className="text-muted-foreground hover:text-destructive">
          Remove these prices
        </Button>
      )}
    >
      {fields.length === 0 && <NoPriceYet />}
      <DragDropProvider
        onDragEnd={(event) => {
          const { source } = event.operation;
          if (event.canceled || !isSortable(source) || source.initialIndex === source.index) return;
          move(source.initialIndex, source.index);
        }}
      >
        {fields.map((field, i) => (
          <PriceRow key={field.id} form={form} fieldId={field.id} group={index} index={i} title={title} onRemove={() => remove(i)} />
        ))}
      </DragDropProvider>
      {!onRemoveGroup && <AddPriceButton title={title} onClick={() => append({ label: "", price: 0 })} />}
    </AgeGroupSection>
  );
}

// A label, a price, and what the price becomes after the early-bird cutoff, on one line.
function PriceRow({ form, fieldId, group, index, title, onRemove }: {
  form: Form;
  fieldId: string;
  group: number;
  index: number;
  title: string;
  onRemove: () => void;
}) {
  const { ref, handleRef, isDragging } = useSortable({ id: fieldId, index, group: `prices-${group}` });
  const [price, lateIncrease] = useWatch({ control: form.control, name: [`tiered.prices.${group}.options.${index}.price`, "tiered.lateIncrease"] });
  const name = `${title} price ${index + 1}`;
  const later = Number.isNaN(price) || Number.isNaN(lateIncrease) ? null : priceAfterCutoff(price, lateIncrease);

  return (
    <div ref={ref} data-price-row className={cn("flex items-start gap-2 rounded bg-background", isDragging && "opacity-50 shadow-lg z-10")}>
      <button
        type="button"
        ref={handleRef}
        className="h-8 w-6 flex items-center justify-center cursor-grab text-muted-foreground hover:text-foreground focus:outline-none"
        tabIndex={-1}
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>

      <Controller
        name={`tiered.prices.${group}.options.${index}.label`}
        control={form.control}
        render={({ field }) => (
          <Input {...field} aria-label={`${name} label`} placeholder="Label (optional)" autoComplete="off" className="h-8 w-48" />
        )}
      />

      {/* Like NumberField, a cleared input is NaN, so it fails with "Required" rather than being
          saved as 0 (which would mean free). */}
      <Controller
        name={`tiered.prices.${group}.options.${index}.price`}
        control={form.control}
        render={({ field, fieldState }) => (
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">$</span>
              <Input
                type="number"
                aria-label={`${name} amount`}
                aria-invalid={fieldState.invalid}
                className="h-8 w-24"
                value={Number.isNaN(field.value) ? "" : field.value}
                onChange={(e) => field.onChange(e.target.value === "" ? NaN : Number(e.target.value))}
                onBlur={field.onBlur}
              />
            </div>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </div>
        )}
      />

      <span className="h-8 flex items-center text-sm text-muted-foreground" data-after-cutoff>
        {later === null ? "" : later === 0 ? "free" : `$${later} after cutoff`}
      </span>

      <button
        type="button"
        onClick={onRemove}
        className="ml-auto h-8 w-6 flex items-center justify-center text-muted-foreground hover:text-destructive"
        aria-label={`Remove ${name}`}
      >
        <X size={16} />
      </button>
    </div>
  );
}
