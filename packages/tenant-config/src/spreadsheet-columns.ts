// The columns of a tenant's spreadsheet, worked out from its config. Shared by the admin's
// Spreadsheet page and the Sheets sync, which must agree on the list column for column. Stored
// `columns` can't be trusted on their own: they go stale whenever the Fields page changes without a
// Spreadsheet edit, so both resolve the list from the active fields every time.

import { FIELD_DEFS } from "@repo/fields";
import type { SpreadsheetConfig, TenantConfig } from "./schemas";

// Computed order and payment columns the sync writes after the registrant columns -- not entered
// by registrants, so not fields in the @repo/fields catalog, and not reorderable or hideable.
// `waiver`, `deposit`, `donation`, and `fees` only apply while that feature is on; the rest always
// do. `isLive` is the order's `orders.is_live`; `key` identifies the order and comes last.
export const SPREADSHEET_SYSTEM_COLUMNS = [
  "admission", "donation", "total", "deposit", "fees", "paid", "charged",
  "status", "purchaser", "completedAt", "paymentId", "paymentEmail",
  "waiver", "isLive", "key",
] as const;
export type SpreadsheetSystemColumn = (typeof SPREADSHEET_SYSTEM_COLUMNS)[number];

type ColumnsConfig = Pick<TenantConfig, "fields_config" | "spreadsheet_config" | "waiver_config" | "payments_config">;

const isSystemColumnRelevant = (column: SpreadsheetSystemColumn, config: ColumnsConfig): boolean => {
  if (column === "waiver") return config.waiver_config.show;
  if (column === "deposit") return config.payments_config.deposit.enabled;
  if (column === "donation") return config.payments_config.donation.enabled;
  if (column === "fees") return config.payments_config.coverFees.enabled;
  return true;
};

// One column per active field (contact, then misc), except fields excluded from the spreadsheet,
// with a field's follow-up getting a column of its own right after it.
const registrantColumnNames = (fields: TenantConfig["fields_config"]): string[] =>
  [...fields.contact, ...fields.misc].flatMap(({ name }) => {
    const def = FIELD_DEFS[name];
    if (def.excludeFromSpreadsheet) return [];
    return def.followUp ? [name, def.followUp.storageKey] : [name];
  });

/**
 * The spreadsheet's columns, in order. `registrant` columns are the organizer's: the stored list's
 * order and visibility, without columns whose fields are no longer active, and with newly
 * available ones appended as visible (opt-out, so a new tenant, which stores none, sees them all).
 * `system` columns follow them, fixed, filtered to the features that are on.
 */
export const resolveSpreadsheetColumns = (config: ColumnsConfig): {
  registrant: SpreadsheetConfig["columns"];
  system: SpreadsheetSystemColumn[];
} => {
  const available = registrantColumnNames(config.fields_config);
  const stored = config.spreadsheet_config.columns.filter((column) => available.includes(column.name));
  const added = available.filter((name) => !stored.some((column) => column.name === name));
  return {
    registrant: [...stored, ...added.map((name) => ({ name, visible: true }))],
    system: SPREADSHEET_SYSTEM_COLUMNS.filter((column) => isSystemColumnRelevant(column, config)),
  };
};
