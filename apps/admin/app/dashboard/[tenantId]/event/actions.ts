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
  const data = parsed.data;

  const hasCalendar = Object.values(data.calendar).some(v => !!v);

  const event_config: EventConfig = {
    title: data.title,
    year: data.year,
    location: data.location,
    date: data.date,
    timezone: data.timezone,
    ...(hasCalendar && { calendar: data.calendar }),
    contacts: {
      info: data.contacts.info,
      ...(data.contacts.housing && { housing: data.contacts.housing }),
    },
    links: {
      ...(data.links.info && { info: data.links.info }),
      ...(data.links.health && { health: data.links.health }),
      ...(data.links.safety && { safety: data.links.safety }),
    },
  };

  await db.updateTenant({ event_config });

  return null;
}
