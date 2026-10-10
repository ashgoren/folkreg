import { describe, it, expect } from "vitest";
import { eventConfigSchema, TIMEZONES, type EventConfig } from "./schemas";

const blank: EventConfig = {
  title: "",
  location: "",
  start: "",
  end: "",
  timezone: "America/Los_Angeles",
  date: "",
  calendar: { show: false, description: "", location: "" },
  contacts: { info: "", housing: "" },
  links: { info: "", health: "", safety: "" },
};

describe("eventConfigSchema", () => {
  // Format-only: an organizer who hasn't filled anything in yet can still save.
  it("accepts a blank event", () => {
    expect(eventConfigSchema.safeParse(blank).success).toBe(true);
  });

  it("accepts a fully filled-in event", () => {
    const full: EventConfig = {
      title: "Spring Dance Weekend",
      location: "Grange Hall",
      start: "2026-04-03T19:00",
      end: "2026-04-05T15:00",
      timezone: "America/Los_Angeles",
      date: "April 3-5",
      calendar: { show: true, description: "Dancing", location: "123 Main St, Portland, OR 97201" },
      contacts: { info: "info@example.org", housing: "housing@example.org" },
      links: { info: "https://example.org", health: "https://example.org/health", safety: "https://example.org/safety" },
    };
    expect(eventConfigSchema.safeParse(full).success).toBe(true);
  });

  it.each([
    ["info", { info: "nope", housing: "" }],
    ["housing", { info: "", housing: "nope" }],
  ])("rejects a malformed %s contact email", (key, contacts) => {
    const result = eventConfigSchema.safeParse({ ...blank, contacts });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["contacts", key]);
    expect(result.error?.issues[0]?.message).toBe("Must be a valid email");
  });

  // The messages each problem gets, by path.
  const issues = (value: object) =>
    eventConfigSchema.safeParse({ ...blank, ...value }).error?.issues.map((issue) => [issue.path.join("."), issue.message]) ?? [];

  describe("start and end", () => {
    it.each(["2026-04-03T19:00", "2026-04-03T19:00:30"])("accepts %j", (start) => {
      expect(issues({ start })).toEqual([]);
    });

    // A date alone, an impossible date, a time with an offset (the timezone supplies that), or a
    // half-typed value from the date-time input.
    it.each(["2026-04-03", "2026-02-30T19:00", "2026-04-03T19:00Z", "2026-04-03T19:00-07:00", "incomplete"])(
      "rejects %j",
      (start) => {
        expect(issues({ start })).toEqual([["start", "Must be a date and time"]]);
      },
    );

    it("rejects an end that isn't after the start", () => {
      expect(issues({ start: "2026-04-03T19:00", end: "2026-04-03T19:00" })).toEqual([["end", "Must be after the start"]]);
      expect(issues({ start: "2026-04-03T19:00", end: "2026-04-02T19:00" })).toEqual([["end", "Must be after the start"]]);
    });

    // Either can be filled in before the other.
    it("accepts one without the other", () => {
      expect(issues({ start: "2026-04-03T19:00" })).toEqual([]);
      expect(issues({ end: "2026-04-05T15:00" })).toEqual([]);
    });
  });

  describe("calendar links", () => {
    it("need both times when they're shown", () => {
      expect(issues({ calendar: { ...blank.calendar, show: true } })).toEqual([
        ["start", "Needed for the calendar links"],
        ["end", "Needed for the calendar links"],
      ]);
      expect(issues({ calendar: { ...blank.calendar, show: true }, start: "2026-04-03T19:00", end: "2026-04-05T15:00" })).toEqual([]);
    });

    // Blank means the calendar uses the event's own location.
    it("leave the maps location optional", () => {
      expect(issues({ calendar: { show: true, description: "", location: "" }, start: "2026-04-03T19:00", end: "2026-04-05T15:00" }))
        .toEqual([]);
    });
  });

  describe("links", () => {
    it.each(["", "https://example.org/policy", "http://example.org"])("accepts %j", (info) => {
      expect(eventConfigSchema.safeParse({ ...blank, links: { ...blank.links, info } }).success).toBe(true);
    });

    // Without a scheme, a link would be relative to the registration site; other schemes aren't web pages.
    it.each(["example.org/policy", "www.example.org", "mailto:info@example.org", "javascript:alert(1)", "https://example"])(
      "rejects %j",
      (safety) => {
        const result = eventConfigSchema.safeParse({ ...blank, links: { ...blank.links, safety } });
        expect(result.error?.issues.map((issue) => [issue.path.join("."), issue.message]))
          .toEqual([["links.safety", "Must be a web address starting with https://"]]);
      },
    );
  });

  describe("timezone", () => {
    it.each(TIMEZONES.map((timezone) => timezone.value))("accepts %s", (timezone) => {
      expect(eventConfigSchema.safeParse({ ...blank, timezone }).success).toBe(true);
    });

    // A timezone outside the list, a misspelling, or none: each would break every time-based rule.
    it.each(["Europe/London", "America/Los_Angles", "Pacific", ""])("rejects %j", (timezone) => {
      const result = eventConfigSchema.safeParse({ ...blank, timezone });
      expect(result.error?.issues.map((issue) => [issue.path.join("."), issue.message])).toEqual([["timezone", "Choose a timezone"]]);
    });

    // The names are what date-fns-tz and Intl take, so each has to be a real IANA timezone.
    it("lists only real IANA timezones", () => {
      const known = new Set(Intl.supportedValuesOf("timeZone"));
      expect(TIMEZONES.filter((timezone) => !known.has(timezone.value))).toEqual([]);
    });
  });
});
