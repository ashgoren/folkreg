"use server";

import { eventConfigSchema, type EventConfig } from "@repo/tenant-config";
import { saveTenantConfig } from "@/lib/save-tenant-config";

export async function updateEvent(tenantId: string, values: EventConfig): Promise<string | null> {
  return saveTenantConfig(tenantId, eventConfigSchema, values, (db, data) => db.updateTenant({ event_config: data }));
}
