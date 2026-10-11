"use server";

import { registrationConfigSchema, type RegistrationConfig } from "@repo/tenant-config";
import { saveTenantConfig } from "@/lib/save-tenant-config";

export async function updateRegistration(tenantId: string, values: RegistrationConfig): Promise<string | null> {
  return saveTenantConfig(tenantId, registrationConfigSchema, values, (db, data) => db.updateTenant({ registration_config: data }));
}
