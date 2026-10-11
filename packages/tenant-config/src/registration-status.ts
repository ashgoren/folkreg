// What registration_config means at a given moment: whether the registration form is taking
// submissions, and if so what a submission becomes. Shared by the admin (the Registration page's
// summary of the current state) and the registration app (what the public page shows, and what an
// order is created as), so both read the stored settings the same way.

import { eventInstant } from "./event-dates";
import type { RegistrationConfig, Timezone } from "./schemas";

export type RegistrationStatus =
  // Taking submissions. closesAt is the closing time, "" while there isn't one on.
  | { state: "open"; closesAt: string }
  // Scheduled to open at opensAt (a stored local date-time).
  | { state: "not-yet-open"; opensAt: string }
  // Not opened: opening is "closed".
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
 * reported is the first of: the opening, the closing time, the people limit.
 */
export const registrationStatus = ({ registration, timezone, now, peopleRegistered }: {
  registration: Pick<RegistrationConfig, "opening" | "opensAt" | "closeAt" | "closeAfter">;
  timezone: Timezone;
  now: Date;
  peopleRegistered: number | null;
}): RegistrationStatus => {
  const { opening, opensAt, closeAt, closeAfter } = registration;
  const hasPassed = (localDateTime: string) => now.getTime() >= eventInstant(localDateTime, timezone).getTime();
  // The schema requires a closing time that's on to be set, so "" here only ever means it's off.
  const closesAt = closeAt.enabled ? closeAt.at : "";

  if (opening === "closed") return { state: "closed" };
  if (opening === "scheduled" && !hasPassed(opensAt)) return { state: "not-yet-open", opensAt };
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
export const submissionMode = ({ registration, peopleNotWaitlisted }: {
  registration: Pick<RegistrationConfig, "mode" | "waitlistAfter">;
  peopleNotWaitlisted: number;
}): RegistrationConfig["mode"] => {
  const { mode, waitlistAfter } = registration;
  if (mode === "pay" && waitlistAfter.enabled && peopleNotWaitlisted >= waitlistAfter.people) return "waitlist";
  return mode;
};
