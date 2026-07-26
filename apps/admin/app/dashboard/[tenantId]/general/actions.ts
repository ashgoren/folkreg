"use server";

import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import { isPostgresError } from "@repo/db/errors";
import { generalSchema, type GeneralValues } from "./schema";

export async function updateGeneral(tenantId: string, values: GeneralValues): Promise<string | null> {
  const parsed = generalSchema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const db = createTenantDb(supabase, tenantId);
  const data = parsed.data;

  try {
    await db.updateTenant({
      slug: data.slug,
      is_live: data.is_live,
      show_preregistration: data.show_preregistration,
    });
  } catch (error: unknown) {
    if (isPostgresError(error) && error.code === '23505') { // Uniqueness violation
      if (error.detail.includes('slug')) return "That slug is already taken";
      return "A uniqueness constraint was violated";
    }
    throw error;
  }

  return null;
}
