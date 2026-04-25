"use server";

import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import { isPostgresError } from "@repo/db/errors";
import type { RegistrationConfig } from "@repo/types";
import { generalSchema, type GeneralValues } from "./schema";

export async function updateGeneral(tenantId: string, values: GeneralValues): Promise<string | null> {
  const parsed = generalSchema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const db = createTenantDb(supabase, tenantId);
  const current = await db.getTenant();
  if (!current) return "No tenant found";

  try {
    await db.updateTenant({
      slug: values.slug,
      domain: values.domain || null,
      is_live: values.is_live,
      registration_config: {
        ...current.registration_config,
        waitlistCutoff: values.waitlistEnabled ? values.waitlistCutoff : null,
        showPreregistration: values.showPreregistration,
      } as RegistrationConfig,
    });
  } catch (error: unknown) {
    if (isPostgresError(error) && error.code === '23505') { // Uniqueness violation
      if (error.detail.includes('slug')) return "That slug is already taken";
      if (error.detail.includes('domain')) return "That domain is already in use";
      return "A uniqueness constraint was violated";
    }
    throw error;
  }

  return null;
}
