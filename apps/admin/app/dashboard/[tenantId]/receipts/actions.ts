"use server";

import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import { TenantNotFoundError } from "@repo/db/errors";
import type { ReceiptsConfig } from "@repo/types";
import { receiptsSchema, type ReceiptsValues } from "./schema";

export async function updateReceipts(tenantId: string, values: ReceiptsValues): Promise<string | null> {
  const parsed = receiptsSchema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const db = createTenantDb(supabase, tenantId);

  const receipts_config: ReceiptsConfig = parsed.data;

  try {
    await db.updateTenant({ receipts_config });
  } catch (error: unknown) {
    if (error instanceof TenantNotFoundError) return "No tenant found";
    throw error;
  }

  return null;
}
