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
    contacts: {
      info: values.contacts.info,
      ...(values.contacts.housing && { housing: values.contacts.housing }),
    },
    links: {
      ...(values.links.info && { info: values.links.info }),
      ...(values.links.health && { health: values.links.health }),
      ...(values.links.safety && { safety: values.links.safety }),
    },
  };

  await db.updateTenant({ event_config });

  return null;
}
