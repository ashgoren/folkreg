// What registration_config means at a given moment: whether the registration form is taking
// submissions, and if so what a submission becomes. Shared by the admin (the Registration page's
// summary of the current state) and the registration app (what the public page shows, and what an
// order is created as), so both read the stored settings the same way.

import { eventInstant } from "./event-dates";
import type { RegistrationConfig, Timezone } from "./schemas";

export type RegistrationStatus =
  // Taking submissions. closesAt is the stored closing time, "" if there isn't one.
  | { state: "open"; closesAt: string }
  // Will open at opensAt (a stored local date-time), unless the switch is turned off before then.
  | { state: "not-yet-open"; opensAt: string }
  // Turned off by hand.
  | { state: "closed" }
  // Closed by the closing time (a stored local date-time).
  | { state: "past-closing-time"; closesAt: string }
  // Closed because closeAfter's number of people have registered.
  | { state: "full"; people: number };

/**
 * Whether the registration form takes submissions at `now`. `peopleRegistered` counts everyone
 * registered, waitlisted people and lottery entries included (what closeAfter limits); null when
 * the caller can't count orders, in which case the closeAfter limit is never reported as reached.
 *
 * Every condition has to allow submissions for the form to be open. When several don't, the one
 * reported is the first of: the switch, the opening time, the closing time, the people limit.
 */
export const registrationStatus = (
  registration: RegistrationConfig,
  timezone: Timezone,
  now: Date,
  peopleRegistered: number | null,
): RegistrationStatus => {
  const { open, opensAt, closesAt, closeAfter } = registration;
  const hasPassed = (localDateTime: string) => now.getTime() >= eventInstant(localDateTime, timezone).getTime();

  if (!open) return { state: "closed" };
  if (opensAt !== "" && !hasPassed(opensAt)) return { state: "not-yet-open", opensAt };
  if (closesAt !== "" && hasPassed(closesAt)) return { state: "past-closing-time", closesAt };
  if (closeAfter.enabled && peopleRegistered !== null && peopleRegistered >= closeAfter.people) {
    return { state: "full", people: closeAfter.people };
  }
  return { state: "open", closesAt };
};

/**
 * What a submission to an open registration form becomes: a registration paid for right away, an
 * entry in the lottery, or a place on the waitlist. `peopleNotWaitlisted` counts registered people
 * who aren't on the waitlist (what waitlistAfter limits); it only matters in "pay" mode.
 */
export const submissionMode = (registration: RegistrationConfig, peopleNotWaitlisted: number): RegistrationConfig["mode"] => {
  const { mode, waitlistAfter } = registration;
  if (mode === "pay" && waitlistAfter.enabled && peopleNotWaitlisted >= waitlistAfter.people) return "waitlist";
  return mode;
};
