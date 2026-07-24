"use server";

import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import type { ThemeConfig } from "@repo/types";
import { appearanceSchema, type AppearanceValues } from "./schema";

export async function updateAppearance(tenantId: string, values: AppearanceValues): Promise<string | null> {
  const parsed = appearanceSchema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const db = createTenantDb(supabase, tenantId);

  const theme_config: ThemeConfig = { ...values };

  await db.updateTenant({ theme_config });

  return null;
}
