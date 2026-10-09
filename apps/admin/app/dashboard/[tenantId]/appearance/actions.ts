"use server";

import { themeConfigSchema, type ThemeConfig } from "@repo/tenant-config";
import { saveTenantConfig } from "@/lib/save-tenant-config";

export async function updateAppearance(tenantId: string, values: ThemeConfig): Promise<string | null> {
  return saveTenantConfig(tenantId, themeConfigSchema, values, (db, data) => db.updateTenant({ theme_config: data }));
}
