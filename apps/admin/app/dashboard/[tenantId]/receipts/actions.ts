"use server";

import { receiptsConfigSchema, type ReceiptsConfig } from "@repo/tenant-config";
import { saveTenantConfig } from "@/lib/save-tenant-config";

export async function updateReceipts(tenantId: string, values: ReceiptsConfig): Promise<string | null> {
  return saveTenantConfig(tenantId, receiptsConfigSchema, values, (db, data) => db.updateTenant({ receipts_config: data }));
}
