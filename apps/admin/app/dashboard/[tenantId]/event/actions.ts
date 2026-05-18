"use server";

import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import type { EventConfig } from "@repo/types";
import { eventSchema, type EventValues } from "./schema";

export async function updateEvent(tenantId: string, values: EventValues): Promise<string | null> {
  const parsed = eventSchema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const db = createTenantDb(supabase, tenantId);

  const hasCalendar = Object.values(values.calendar).some(v => !!v);

  const event_config: EventConfig = {
    title: values.title,
    year: values.year,
    location: values.location,
    date: values.date,
    timezone: values.timezone,
    ...(hasCalendar && { calendar: values.calendar }),
    contacts: values.contacts,
    links: values.links,
    nametags: values.nametags,
  };

  await db.updateTenant({ event_config });

  return null;
}
