"use server";

import { saveTenantConfig } from "@/lib/save-tenant-config";
import { waiversSchema, type WaiversValues } from "./schema";

export async function updateWaivers(tenantId: string, values: WaiversValues): Promise<string | null> {
  return saveTenantConfig(tenantId, waiversSchema, values, async (db, data) => {
    // The API key goes to tenant_secrets, where an unset column is null; the rest is waiver_config.
    const { docuseal_key, ...config } = data;
    await db.updateTenant({ waiver_config: config });
    await db.updateTenantSecrets({ docuseal_key: docuseal_key || null });
  });
}
