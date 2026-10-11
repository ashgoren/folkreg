"use server";

import { isPostgresError } from "@repo/db/errors";
import { saveTenantConfig } from "@/lib/save-tenant-config";
import { slugValuesSchema } from "./schema";

export async function updateSlug(tenantId: string, slug: string): Promise<string | null> {
  return saveTenantConfig(tenantId, slugValuesSchema, { slug }, async (db, data) => {
    try {
      await db.updateTenant(data);
    } catch (error: unknown) {
      if (isPostgresError(error) && error.code === "23505") { // Uniqueness violation
        // The violated constraint is named in `message`; `details` comes back null here.
        if (error.message.includes("tenants_slug_key")) return "That subdomain is already taken";
        return "A uniqueness constraint was violated";
      }
      throw error;
    }
  });
}
