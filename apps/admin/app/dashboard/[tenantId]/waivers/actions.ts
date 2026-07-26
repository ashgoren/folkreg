"use server";

import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import type { WaiverConfig } from "@repo/types";
import { waiversSchema, type WaiversValues } from "./schema";

export async function updateWaivers(tenantId: string, values: WaiversValues): Promise<string | null> {
  const parsed = waiversSchema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const db = createTenantDb(supabase, tenantId);
  const data = parsed.data;

  const waiver_config: WaiverConfig = {
    show: data.show,
    docusealTemplateId: data.docusealTemplateId || null,
  };

  await db.updateTenant({ waiver_config });
  await db.updateTenantSecrets({ docuseal_key: data.docuseal_key || null });

  return null;
}
