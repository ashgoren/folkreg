"use client";

import { useWatch } from "react-hook-form";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { FieldGroup } from "@/components/ui/field";
import { AutosaveStatus } from "@/components/autosave-status";
import { FormLabel } from "@/components/form-label";
import { TextField } from "@/components/form-text-field";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import type { Tenant } from "@repo/types";
import { resolveSpreadsheetColumns, spreadsheetConfigSchema } from "@repo/tenant-config";
import { updateSpreadsheet } from "./actions";
import { SpreadsheetFieldRow } from "./SpreadsheetFieldRow";

export function SpreadsheetForm({ tenant }: { tenant: Tenant }) {
  // The same list the Sheets sync writes. Registrant columns are the form's; system ones are fixed.
  const { registrant: initialColumns, system: systemColumns } = resolveSpreadsheetColumns(tenant);

  const { form, formProps, isPending, savedRecently } = useAutosaveForm({
    label: "Spreadsheet",
    schema: spreadsheetConfigSchema,
    defaultValues: {
      sheetId: tenant.spreadsheet_config.sheetId,
      columns: initialColumns,
    },
    save: (data) => updateSpreadsheet(tenant.id, data),
  });

  const columns = useWatch({ control: form.control, name: "columns" });

  function toggleVisible(name: string) {
    form.setValue(
      "columns",
      columns.map((col) => (col.name === name ? { ...col, visible: !col.visible } : col)),
    );
  }

  return (
    <form {...formProps} className="space-y-8">

      <FieldGroup>
        <TextField control={form.control} name="sheetId" id="spreadsheet-sheet-id" label="Spreadsheet URL or ID" autoComplete="off" />
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
          {systemColumns.map((name) => (
            <div
              key={name}
              className="rounded border border-border bg-muted/30 px-2.5 py-1.5 text-sm text-muted-foreground"
            >
              {name}
            </div>
          ))}
        </div>
      </div>

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
