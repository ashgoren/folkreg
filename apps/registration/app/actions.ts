"use server";

import { redirect } from "next/navigation";
import { registrationStatus, submissionMode, eventYear } from "@repo/tenant-config";
import type { Person } from "@repo/types";
import { getRequestTenant } from "@/lib/tenant";
import { buildRegistrationSchema, type RegistrationParty } from "./registration-party";

// Re-validates, re-checks registrationStatus (time may have passed or event filled since page load),
// decides the order's mode, creates the order in that mode, then redirects (or returns an error).
export const submitRegistration = async (values: RegistrationParty): Promise<{ error: string }> => {
  const { db, tenant } = await getRequestTenant();
  const year = eventYear(tenant.event_config) ?? new Date().getFullYear();
  const peopleRegistered = await db.countRegisteredPeople(year);

  const status = registrationStatus({
    registration: tenant.registration_config,
    timezone: tenant.event_config.timezone,
    now: new Date(),
    peopleRegistered,
  });
  if (status.state !== "open") return { error: "Registration is no longer open." };

  const parsed = buildRegistrationSchema(tenant.fields_config).safeParse(values);
  if (!parsed.success) return { error: "Please fix the highlighted fields." };

  const mode = submissionMode({ registration: tenant.registration_config, peopleRegistered });
  const people: Person[] = [parsed.data.registrant, ...parsed.data.companions];
  await db.createOrder({ people, isTest: false, eventYear: year, submissionMode: mode });

  redirect(mode === "pay" ? "/payment" : mode === "lottery" ? "/lottery" : "/waitlist");
};
