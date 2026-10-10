"use server";

import { waiverConfigSchema, type WaiverConfig } from "@repo/tenant-config";
import { saveTenantConfig } from "@/lib/save-tenant-config";
import { waiverSecretsSchema, type WaiverSecretsValues } from "./schema";

// The Waivers page saves its two tables separately, each only when it changed (see
// useSaveChangedParts), so a config change never resends the key.

export async function updateWaivers(tenantId: string, config: WaiverConfig): Promise<string | null> {
  return saveTenantConfig(tenantId, waiverConfigSchema, config, (db, data) => db.updateTenant({ waiver_config: data }));
}

export async function updateWaiverSecrets(tenantId: string, secrets: WaiverSecretsValues): Promise<string | null> {
  // Unset is null in tenant_secrets.
  return saveTenantConfig(tenantId, waiverSecretsSchema, secrets, (db, data) => db.updateTenantSecrets({ docuseal_key: data.docuseal_key || null }));
}
