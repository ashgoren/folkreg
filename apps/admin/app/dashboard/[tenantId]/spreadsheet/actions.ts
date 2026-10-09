"use server";

import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import { TenantNotFoundError } from "@repo/db/errors";
import { spreadsheetConfigSchema, type SpreadsheetConfig } from "@repo/tenant-config";

export async function updateSpreadsheet(tenantId: string, values: SpreadsheetConfig): Promise<string | null> {
  const parsed = spreadsheetConfigSchema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const db = createTenantDb(supabase, tenantId);

  try {
    await db.updateTenant({ spreadsheet_config: parsed.data });
  } catch (error: unknown) {
    if (error instanceof TenantNotFoundError) return "No tenant found";
    throw error;
  }

  return null;
}
