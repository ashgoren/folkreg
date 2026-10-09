import { describe, it, expect } from "vitest";
import { eventSchema, type EventValues } from "./schema";

const blank: EventValues = {
  title: "",
  year: 2026,
  location: "",
  date: "",
  timezone: "",
  calendar: { title: "", description: "", location: "", start: "", end: "" },
  contacts: { info: "", housing: "" },
  links: { info: "", health: "", safety: "" },
};

describe("eventSchema", () => {
  // Format-only: an organizer who has only filled in the year so far can still save.
  it("accepts an otherwise-blank event", () => {
    expect(eventSchema.safeParse(blank).success).toBe(true);
  });

  it("accepts a fully filled-in event", () => {
    const full: EventValues = {
      title: "Spring Dance Weekend",
      year: 2026,
      location: "Grange Hall",
      date: "April 3-5",
      timezone: "America/Los_Angeles",
      calendar: { title: "SDW", description: "Dancing", location: "Grange Hall", start: "2026-04-03T19:00", end: "2026-04-05T15:00" },
      contacts: { info: "info@example.org", housing: "housing@example.org" },
      links: { info: "https://example.org", health: "https://example.org/health", safety: "https://example.org/safety" },
    };
    expect(eventSchema.safeParse(full).success).toBe(true);
  });

  it.each([
    ["info", { info: "nope", housing: "" }],
    ["housing", { info: "", housing: "nope" }],
  ])("rejects a malformed %s contact email", (key, contacts) => {
    const result = eventSchema.safeParse({ ...blank, contacts });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["contacts", key]);
    expect(result.error?.issues[0]?.message).toBe("Must be a valid email");
  });

  it.each([1999, 2101, 2026.5, NaN])("rejects year %s", (year) => {
    const result = eventSchema.safeParse({ ...blank, year });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["year"]);
  });

  it.each([2000, 2100])("accepts boundary year %s", (year) => {
    expect(eventSchema.safeParse({ ...blank, year }).success).toBe(true);
  });
});
