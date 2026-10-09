"use server";

import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import { TenantNotFoundError } from "@repo/db/errors";
import type { EventConfig } from "@repo/types";
import { eventSchema, type EventValues } from "./schema";

export async function updateEvent(tenantId: string, values: EventValues): Promise<string | null> {
  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const db = createTenantDb(supabase, tenantId);

  const event_config: EventConfig = parsed.data;

  try {
    await db.updateTenant({ event_config });
  } catch (error: unknown) {
    if (error instanceof TenantNotFoundError) return "No tenant found";
    throw error;
  }

  return null;
}
