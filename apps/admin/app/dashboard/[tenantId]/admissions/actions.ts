"use server";

import { admissionsConfigSchema, type AdmissionsConfig } from "@repo/tenant-config";
import { saveTenantConfig } from "@/lib/save-tenant-config";

export async function updateAdmissions(tenantId: string, values: AdmissionsConfig): Promise<string | null> {
  return saveTenantConfig(tenantId, admissionsConfigSchema, values, (db, data) => db.updateTenant({ admissions_config: data }));
}
