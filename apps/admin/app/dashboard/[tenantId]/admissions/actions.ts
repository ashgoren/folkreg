"use server";

import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import { TenantNotFoundError } from "@repo/db/errors";
import type { AdmissionsConfig } from "@repo/types";
import { admissionsSchema, type AdmissionsValues } from "./schema";

export async function updateAdmissions(tenantId: string, values: AdmissionsValues): Promise<string | null> {
  const parsed = admissionsSchema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const db = createTenantDb(supabase, tenantId);

  const admissions_config: AdmissionsConfig = parsed.data;

  try {
    await db.updateTenant({ admissions_config });
  } catch (error: unknown) {
    if (error instanceof TenantNotFoundError) return "No tenant found";
    throw error;
  }

  return null;
}
