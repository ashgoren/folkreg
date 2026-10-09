"use server";

import { fieldsConfigSchema, type FieldsConfig } from "@repo/tenant-config";
import { saveTenantConfig } from "@/lib/save-tenant-config";

export async function updateFields(tenantId: string, values: FieldsConfig): Promise<string | null> {
  return saveTenantConfig(tenantId, fieldsConfigSchema, values, (db, data) => db.updateTenant({ fields_config: data }));
}
