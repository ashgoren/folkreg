// What's shown about an event's dates, derived from the facts event_config stores once: `start`
// and `end` on the event's own clock, and the `timezone` that clock is in. Shared by the admin (the
// Date field's placeholder) and the registration app (date text, calendar links, payment
// descriptions, the early-bird cutoff and payment due date), so both read the stored values the
// same way.

import { fromZonedTime } from "date-fns-tz";
import type { EventConfig, Timezone } from "./schemas";

const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",
];

// The calendar date of a stored "2026-04-03T19:00" (or "2026-04-03"). Read straight from the
// string: it's already on the event's clock, so no timezone conversion is involved.
const calendarDate = (local: string) => {
  const [year, month, day] = local.slice(0, 10).split("-").map(Number) as [number, number, number];
  return { year, month: MONTHS[month - 1]!, day };
};

/** A stored date (YYYY-MM-DD) as registrants read it, e.g. "September 15, 2026"; "" while unset. */
export const formatDate = (date: string): string => {
  if (date === "") return "";
  const { year, month, day } = calendarDate(date);
  return `${month} ${day}, ${year}`;
};

/**
 * The event's dates as registrants read them, written out as briefly as they allow: "April 3, 2026",
 * "April 3–5, 2026", "March 30 – April 2, 2026", "December 30, 2026 – January 2, 2027". "" while
 * there's no start; a start with no end reads as that one day.
 */
export const formatEventDates = (start: string, end: string): string => {
  if (start === "") return "";
  const from = calendarDate(start);
  const to = end === "" ? from : calendarDate(end);
  if (from.year !== to.year) return `${from.month} ${from.day}, ${from.year} – ${to.month} ${to.day}, ${to.year}`;
  if (from.month !== to.month) return `${from.month} ${from.day} – ${to.month} ${to.day}, ${from.year}`;
  if (from.day !== to.day) return `${from.month} ${from.day}–${to.day}, ${from.year}`;
  return formatDate(start);
};

/** The dates registrants are shown: the organizer's own wording if there is any, otherwise the range. */
export const eventDateText = (event: Pick<EventConfig, "date" | "start" | "end">): string =>
  event.date || formatEventDates(event.start, event.end);

/** The year the event starts in, e.g. for a payment description ("Spring Dance 2026"); null until there's a start. */
export const eventYear = (event: Pick<EventConfig, "start">): number | null =>
  event.start === "" ? null : Number(event.start.slice(0, 4));

/**
 * The exact moment a date and time on the event's clock happens, e.g. "2026-04-03T19:00" in
 * America/Los_Angeles is 2026-04-04T02:00Z. Daylight saving comes from the timezone, for that date.
 */
export const eventInstant = (localDateTime: string, timezone: Timezone): Date => fromZonedTime(localDateTime, timezone);

export type CalendarEntry = { title: string; description: string; location: string; start: Date; end: Date };

/**
 * What an "Add to calendar" link describes: the event's own title, its maps location (or, if that
 * isn't given, its location), and its exact start and end. null when the links are off, or a time
 * is missing (which the schema doesn't allow while they're on).
 */
export const calendarEntry = (event: EventConfig): CalendarEntry | null => {
  if (!event.calendar.show || event.start === "" || event.end === "") return null;
  return {
    title: event.title,
    description: event.calendar.description,
    location: event.calendar.location || event.location,
    start: eventInstant(event.start, event.timezone),
    end: eventInstant(event.end, event.timezone),
  };
};

/**
 * The last moment of a stored date (YYYY-MM-DD) on the event's clock, for a date that counts as a
 * whole day: the early-bird cutoff (early prices end after it) and the payment due date (deposits
 * stop being offered after it). null for a blank date -- e.g. no early-bird period.
 */
export const endOfDay = (date: string, timezone: Timezone): Date | null =>
  date === "" ? null : eventInstant(`${date}T23:59:59.999`, timezone);
