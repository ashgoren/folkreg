"use server";

import { redirect } from "next/navigation";
import { registrationStatus, submissionMode, eventYear } from "@repo/tenant-config";
import type { Person } from "@repo/types";
import { getRequestTenant } from "@/lib/tenant";
import { getOrderFromCookie, setOrderCookie } from "@/lib/order-session";
import { buildRegistrationSchema, type RegistrationParty } from "./registration-party";

const isRegistrationOpen = (tenant: Awaited<ReturnType<typeof getRequestTenant>>["tenant"]): boolean =>
  registrationStatus({
    registration: tenant.registration_config,
    timezone: tenant.event_config.timezone,
    now: new Date(),
    peopleRegistered: null, // TEMPORARY until countRegisteredPeople is wired in here too
  }).state === "open";

// Creates a new order (and sets its cookie) if this browser has none yet, otherwise updates the
// cookie's order -- the one place that assembles registrant + companions into the flat array orders
// actually store. Shared by saveDraft and submitRegistration, which differ only in what they do with
// the result afterward.
//
// Which order comes only from the httpOnly cookie, never from the client: a server action is a
// public endpoint, so an id passed as an argument could name any order. The client sends only
// expectedUpdatedAt, the version it last saw (null if it has never saved), for updateOrderPeople's
// optimistic-concurrency check. A mismatch between the two is a conflict rather than something to
// paper over: a version with no cookie order means the cookie expired or was cleared mid-session,
// and null with a cookie order usually means another tab created one -- creating a second order
// there would overwrite the cookie and orphan that tab's draft.
const createOrUpdateOrder = async (
  db: Awaited<ReturnType<typeof getRequestTenant>>["db"],
  expectedUpdatedAt: string | null,
  values: RegistrationParty,
  eventYear: number
): Promise<{ id: string; updatedAt: string } | { conflict: true }> => {
  const people: Person[] = [values.registrant, ...values.companions];
  const existing = await getOrderFromCookie();

  if (!existing && expectedUpdatedAt === null) {
    const created = await db.createOrder({ people, isTest: false, eventYear });
    await setOrderCookie(created.id);
    return created;
  }
  if (!existing || expectedUpdatedAt === null) return { conflict: true };

  const updated = await db.updateOrderPeople(existing.id, people, expectedUpdatedAt);
  return updated ? { id: existing.id, updatedAt: updated.updatedAt } : { conflict: true };
};

// Autosave doesn't validate (see registration-party.ts) -- it persists whatever's currently in the
// form, creating the order on the first call and updating it from there. Never confirms, never
// redirects.
export const saveDraft = async (
  expectedUpdatedAt: string | null,
  values: RegistrationParty
): Promise<{ updatedAt: string } | { conflict: true }> => {
  const { db, tenant } = await getRequestTenant();
  if (!isRegistrationOpen(tenant)) return expectedUpdatedAt === null ? { conflict: true } : { updatedAt: expectedUpdatedAt };

  const year = eventYear(tenant.event_config) ?? new Date().getFullYear();
  const result = await createOrUpdateOrder(db, expectedUpdatedAt, values, year);
  return "conflict" in result ? result : { updatedAt: result.updatedAt };
};

// The Continue submit: re-validates strictly (the client's own zodResolver already did, but this is
// a server action, reachable on its own), re-checks registrationStatus (time may have passed since
// the page loaded), decides the order's mode for real, and confirms -- then redirects. Only returns
// when it isn't redirecting, i.e. on a problem the caller needs to show.
export const submitRegistration = async (
  expectedUpdatedAt: string | null,
  values: RegistrationParty
): Promise<{ conflict: true } | { error: string }> => {
  const { db, tenant } = await getRequestTenant();
  if (!isRegistrationOpen(tenant)) return { error: "Registration is no longer open." };

  const parsed = buildRegistrationSchema(tenant.fields_config).safeParse(values);
  if (!parsed.success) return { error: "Please fix the highlighted fields." };

  const year = eventYear(tenant.event_config) ?? new Date().getFullYear();
  const result = await createOrUpdateOrder(db, expectedUpdatedAt, parsed.data, year);
  if ("conflict" in result) return result;

  const mode = submissionMode({
    registration: tenant.registration_config,
    peopleRegistered: 0, // TEMPORARY until countRegisteredPeople is wired in here too
  });
  await db.confirmRegistration(result.id, mode);

  redirect(mode === "pay" ? "/payment" : mode === "lottery" ? "/lottery" : "/waitlist");
};
