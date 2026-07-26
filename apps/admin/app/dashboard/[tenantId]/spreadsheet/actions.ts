"use server";

import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import type { SpreadsheetConfig } from "@repo/types";
import { spreadsheetSchema, type SpreadsheetValues } from "./schema";

export async function updateSpreadsheet(tenantId: string, values: SpreadsheetValues): Promise<string | null> {
  const parsed = spreadsheetSchema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const db = createTenantDb(supabase, tenantId);

  const spreadsheet_config: SpreadsheetConfig = parsed.data;

  await db.updateTenant({ spreadsheet_config });

  return null;
}
