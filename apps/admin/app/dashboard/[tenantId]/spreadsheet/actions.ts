"use server";

import { spreadsheetConfigSchema, type SpreadsheetConfig } from "@repo/tenant-config";
import { saveTenantConfig } from "@/lib/save-tenant-config";

export async function updateSpreadsheet(tenantId: string, values: SpreadsheetConfig): Promise<string | null> {
  return saveTenantConfig(tenantId, spreadsheetConfigSchema, values, (db, data) => db.updateTenant({ spreadsheet_config: data }));
}
