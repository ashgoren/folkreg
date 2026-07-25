"use client";

import { useEffect } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FIELD_DEFS } from "@repo/fields";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import { useAutosave } from "@/lib/useAutosave";
import type { Tenant } from "@repo/types";
import { SPREADSHEET_SYSTEM_COLUMNS } from "@repo/types";
import { spreadsheetSchema, type SpreadsheetValues } from "./schema";
import { updateSpreadsheet } from "./actions";
import { SpreadsheetFieldRow } from "./SpreadsheetFieldRow";

function isSystemColumnRelevant(column: string, tenant: Tenant): boolean {
  if (column === "waiver") return tenant.waiver_config?.show ?? false;
  if (column === "deposit") return tenant.payments_config?.deposit?.enabled ?? false;
  if (column === "donation") return tenant.payments_config?.donation?.enabled ?? false;
  return true;
}

export function SpreadsheetForm({ tenant }: { tenant: Tenant }) {
  const activeFieldNames = [
    ...(tenant.fields_config?.contactOrder ?? []),
    ...(tenant.fields_config?.miscOrder ?? []),
  ];

  const availableRegistrantColumns: string[] = [];
  for (const name of activeFieldNames) {
    const def = FIELD_DEFS[name];
    if (!def || def.excludeFromSpreadsheet) continue;
    availableRegistrantColumns.push(name);
    if (def.followUp) availableRegistrantColumns.push(def.followUp.storageKey);
  }

  // A brand-new tenant (or one with stale data from before columns existed) defaults
  // everything to visible. On later visits, a no-longer-available column drops out
  // entirely, and a newly-available one gets appended as visible -- opt-out, not opt-in.
  const storedColumns = tenant.spreadsheet_config?.columns;
  const initialColumns = Array.isArray(storedColumns)
    ? [
        ...storedColumns.filter((col) => availableRegistrantColumns.includes(col.name)),
        ...availableRegistrantColumns
          .filter((name) => !storedColumns.some((col) => col.name === name))
          .map((name) => ({ name, visible: true })),
      ]
    : availableRegistrantColumns.map((name) => ({ name, visible: true }));

  const form = useForm<SpreadsheetValues>({
    mode: "onBlur",
    resolver: zodResolver(spreadsheetSchema),
    defaultValues: {
      sheetId: tenant.spreadsheet_config?.sheetId ?? "",
      columns: initialColumns,
    },
  });

  const { saveDebounced, isPending, savedRecently } = useAutosave<SpreadsheetValues>(
    (data) => updateSpreadsheet(tenant.id, data),
  );

  useEffect(() => {
    const subscription = form.watch((values) => {
      if (!spreadsheetSchema.safeParse(values).success) return;
      saveDebounced(values as SpreadsheetValues);
    });
    return () => subscription.unsubscribe();
  }, [form, saveDebounced]);

  const columns = form.watch("columns");
  const systemColumns = SPREADSHEET_SYSTEM_COLUMNS.filter((column) => isSystemColumnRelevant(column, tenant));

  function toggleVisible(name: string) {
    form.setValue(
      "columns",
      columns.map((col) => (col.name === name ? { ...col, visible: !col.visible } : col)),
    );
  }

  return (
    <div className="space-y-8">

      <FieldGroup>
        <Controller name="sheetId" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="spreadsheet-sheet-id">Spreadsheet URL or ID</FormLabel>
            <Input {...field} id="spreadsheet-sheet-id" autoComplete="off" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />
      </FieldGroup>

      <div className="max-w-md space-y-2">
        <FormLabel>Columns</FormLabel>

        {columns.length === 0 ? (
          <p className="text-sm text-muted-foreground italic mt-1">
            No active fields yet — activate some on the Fields page first.
          </p>
        ) : (
          <DragDropProvider
            onDragEnd={(event) => {
              if (event.canceled) return;
              const names = columns.map((col) => col.name);
              const newOrder = move(names, event) as string[];
              const byName = new Map(columns.map((col) => [col.name, col]));
              form.setValue("columns", newOrder.map((name) => byName.get(name)!));
            }}
          >
            <div className="flex flex-col gap-1">
              {columns.map((col, index) => (
                <SpreadsheetFieldRow
                  key={col.name}
                  name={col.name}
                  index={index}
                  visible={col.visible}
                  onToggleVisible={() => toggleVisible(col.name)}
                />
              ))}
            </div>
          </DragDropProvider>
        )}

        <div className="flex flex-col gap-1 pt-1">
          {[...systemColumns, "key"].map((name) => (
            <div
              key={name}
              className="rounded border border-border bg-muted/30 px-2.5 py-1.5 text-sm text-muted-foreground"
            >
              {name}
            </div>
          ))}
        </div>
      </div>

      <div className="text-sm text-muted-foreground h-5">
        {isPending ? "Saving…" : savedRecently ? "Saved ✓" : null}
      </div>
    </div>
  );
}
