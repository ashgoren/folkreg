"use server";

import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import { TenantNotFoundError } from "@repo/db/errors";
import type { WaiverConfig } from "@repo/types";
import { waiversSchema, type WaiversValues } from "./schema";

export async function updateWaivers(tenantId: string, values: WaiversValues): Promise<string | null> {
  const parsed = waiversSchema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const db = createTenantDb(supabase, tenantId);

  // The API key goes to tenant_secrets, where an unset column is null; the rest is waiver_config.
  const { docuseal_key, ...config } = parsed.data;
  const waiver_config: WaiverConfig = config;

  try {
    await db.updateTenant({ waiver_config });
    await db.updateTenantSecrets({ docuseal_key: docuseal_key || null });
  } catch (error: unknown) {
    if (error instanceof TenantNotFoundError) return "No tenant found";
    throw error;
  }

  return null;
}
