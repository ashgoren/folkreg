"use server";

import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import type { FieldsConfig } from "@repo/types";
import { fieldsSchema, type FieldsValues } from "./schema";

export async function updateFields(tenantId: string, values: FieldsValues): Promise<string | null> {
  const parsed = fieldsSchema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const db = createTenantDb(supabase, tenantId);
  const current = await db.getTenant();
  if (!current) return "No tenant found";

  await db.updateTenant({
    fields_config: values as FieldsConfig,
  });

  return null;
}
