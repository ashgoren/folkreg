"use server";

import { redirect } from "next/navigation";
import { registrationStatus, submissionMode, eventYear } from "@repo/tenant-config";
import type { Person } from "@repo/types";
import { getRequestTenant } from "@/lib/tenant";
import { buildRegistrationSchema, type RegistrationParty } from "./registration-party";

// Re-check to catch the unlikely case that registration closed between page load and submit.
const isRegistrationOpen = (tenant: Awaited<ReturnType<typeof getRequestTenant>>["tenant"]): boolean =>
  registrationStatus({
    registration: tenant.registration_config,
    timezone: tenant.event_config.timezone,
    now: new Date(),
    peopleRegistered: null, // TEMPORARY until countRegisteredPeople is wired in here too
  }).state === "open";

// The Continue submit: re-validates, re-checks registrationStatus (time may have passed since page load),
// creates the order, decides the order mode for real, confirms, then redirects (or returns an error).
export const submitRegistration = async (values: RegistrationParty): Promise<{ error: string }> => {
  const { db, tenant } = await getRequestTenant();
  if (!isRegistrationOpen(tenant)) return { error: "Registration is no longer open." };

  const parsed = buildRegistrationSchema(tenant.fields_config).safeParse(values);
  if (!parsed.success) return { error: "Please fix the highlighted fields." };

  const people: Person[] = [parsed.data.registrant, ...parsed.data.companions];
  const year = eventYear(tenant.event_config) ?? new Date().getFullYear();
  const created = await db.createOrder({ people, isTest: false, eventYear: year });

  const mode = submissionMode({
    registration: tenant.registration_config,
    peopleRegistered: 0, // TEMPORARY until countRegisteredPeople is wired in here too
  });
  await db.confirmRegistration(created.id, mode);

  redirect(mode === "pay" ? "/payment" : mode === "lottery" ? "/lottery" : "/waitlist");
};
