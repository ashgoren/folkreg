import { describe, it, expect } from "vitest";
import { defaultEventConfig } from "./defaults";
import { calendarEntry, earlybirdEndsAt, eventDateText, eventInstant, eventYear, formatEventDates } from "./event-dates";
import type { EventConfig } from "./schemas";

const event = (overrides: Partial<EventConfig> = {}): EventConfig => ({
  ...defaultEventConfig(),
  title: "Spring Dance Weekend",
  location: "Grange Hall",
  start: "2026-04-03T19:00",
  end: "2026-04-05T15:00",
  ...overrides,
});

describe("formatEventDates", () => {
  it.each([
    ["2026-04-03T19:00", "2026-04-03T22:00", "April 3, 2026"],
    ["2026-04-03T19:00", "2026-04-05T15:00", "April 3–5, 2026"],
    ["2026-03-30T19:00", "2026-04-02T15:00", "March 30 – April 2, 2026"],
    ["2026-12-30T19:00", "2027-01-02T15:00", "December 30, 2026 – January 2, 2027"],
  ])("writes %s to %s as %j", (start, end, text) => {
    expect(formatEventDates(start, end)).toBe(text);
  });

  it("reads a start with no end as that one day, and no start as nothing", () => {
    expect(formatEventDates("2026-04-03T19:00", "")).toBe("April 3, 2026");
    expect(formatEventDates("", "2026-04-05T15:00")).toBe("");
  });

  // The stored times are already on the event's clock: a late-evening start stays on its own date.
  it("uses the dates as stored, whatever the time", () => {
    expect(formatEventDates("2026-04-03T23:30", "2026-04-04T00:30")).toBe("April 3–4, 2026");
  });
});

describe("eventDateText", () => {
  it("prefers the organizer's own wording", () => {
    expect(eventDateText(event({ date: "Easter weekend" }))).toBe("Easter weekend");
  });

  it("falls back to the range from start to end", () => {
    expect(eventDateText(event())).toBe("April 3–5, 2026");
  });
});

describe("eventYear", () => {
  it("is the start's year, or null until there's a start", () => {
    expect(eventYear(event({ start: "2026-12-30T19:00" }))).toBe(2026);
    expect(eventYear(event({ start: "" }))).toBeNull();
  });
});

describe("eventInstant", () => {
  // The same 7pm is a different moment depending on daylight saving that day.
  it.each([
    ["2026-04-03T19:00", "America/Los_Angeles", "2026-04-04T02:00:00.000Z"], // PDT, UTC-7
    ["2026-11-07T19:00", "America/Los_Angeles", "2026-11-08T03:00:00.000Z"], // PST, UTC-8
    ["2026-07-10T19:00", "America/Phoenix", "2026-07-11T02:00:00.000Z"], // no daylight saving: UTC-7 all year
    ["2026-01-10T19:00", "America/Phoenix", "2026-01-11T02:00:00.000Z"],
    ["2026-07-10T19:00", "America/New_York", "2026-07-10T23:00:00.000Z"], // EDT, UTC-4
    ["2026-07-10T19:00", "Pacific/Honolulu", "2026-07-11T05:00:00.000Z"], // UTC-10
  ] as const)("reads %s in %s as %s", (local, timezone, utc) => {
    expect(eventInstant(local, timezone).toISOString()).toBe(utc);
  });
});

describe("calendarEntry", () => {
  it("is the event's title, location, and exact times when the links are on", () => {
    expect(calendarEntry(event({ calendar: { show: true, description: "Contra dancing", location: "" } }))).toEqual({
      title: "Spring Dance Weekend",
      description: "Contra dancing",
      location: "Grange Hall",
      start: new Date("2026-04-04T02:00:00.000Z"),
      end: new Date("2026-04-05T22:00:00.000Z"),
    });
  });

  // For maps apps, which need something they can look up.
  it("uses the maps location when there is one", () => {
    const entry = calendarEntry(event({ calendar: { show: true, description: "", location: "123 Main St, Portland, OR 97201" } }));
    expect(entry?.location).toBe("123 Main St, Portland, OR 97201");
  });

  it("is null when the links are off, or a time is missing", () => {
    expect(calendarEntry(event())).toBeNull();
    expect(calendarEntry(event({ calendar: { show: true, description: "", location: "" }, end: "" }))).toBeNull();
  });
});

describe("earlybirdEndsAt", () => {
  // The whole cutoff day counts, on the event's clock: 11:59pm Pacific on November 10 is the next
  // morning in UTC.
  it("is the last moment of the cutoff day in the event's timezone", () => {
    expect(earlybirdEndsAt("2026-11-10", "America/Los_Angeles")?.toISOString()).toBe("2026-11-11T07:59:59.999Z");
  });

  it("is null when there's no cutoff (no early-bird period)", () => {
    expect(earlybirdEndsAt("", "America/Los_Angeles")).toBeNull();
  });
});
