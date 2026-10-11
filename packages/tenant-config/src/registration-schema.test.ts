import { describe, it, expect } from "vitest";
import { defaultRegistrationConfig } from "./defaults";
import type { RegistrationConfig } from "./schemas";
import { registrationConfigSchema } from "./schemas";

const base = defaultRegistrationConfig();

const issues = (values: Partial<RegistrationConfig>) =>
  registrationConfigSchema.safeParse({ ...base, ...values }).error?.issues.map((issue) => [issue.path.join("."), issue.message]) ?? [];

describe("registrationConfigSchema", () => {
  it("accepts the default config", () => {
    expect(issues({})).toEqual([]);
  });

  it.each(["pay", "lottery", "waitlist"] as const)("accepts %s mode", (mode) => {
    expect(issues({ mode })).toEqual([]);
  });

  it("rejects an unknown mode", () => {
    expect(registrationConfigSchema.safeParse({ ...base, mode: "raffle" }).success).toBe(false);
  });

  describe("opening and closing times", () => {
    // Either, both, or neither: each is its own optional limit.
    it.each([
      ["neither", "", ""],
      ["only an opening time", "2026-11-01T12:00", ""],
      ["only a closing time", "", "2026-11-15T12:00"],
      ["both", "2026-11-01T12:00", "2026-11-15T12:00"],
    ])("accepts %s", (_, opensAt, closesAt) => {
      expect(issues({ opensAt, closesAt })).toEqual([]);
    });

    it.each(["Nov 1 at noon", "2026-11-01", "2026-11-01T25:00"])("rejects an opening time of %j", (opensAt) => {
      expect(issues({ opensAt })).toEqual([["opensAt", "Must be a date and time"]]);
    });

    it("rejects a closing time that isn't after the opening time, attached to the closing time", () => {
      expect(issues({ opensAt: "2026-11-01T12:00", closesAt: "2026-11-01T12:00" })).toEqual([["closesAt", "Must be after the opening time"]]);
      expect(issues({ opensAt: "2026-11-01T12:00", closesAt: "2026-10-31T12:00" })).toEqual([["closesAt", "Must be after the opening time"]]);
    });

    // A date-time input may give seconds or not; the same moment written both ways is equal.
    it("compares times written with and without seconds", () => {
      expect(issues({ opensAt: "2026-11-01T12:00:00", closesAt: "2026-11-01T12:00" })).toEqual([["closesAt", "Must be after the opening time"]]);
      expect(issues({ opensAt: "2026-11-01T12:00", closesAt: "2026-11-01T12:00:30" })).toEqual([]);
    });
  });

  describe("people limits", () => {
    // The number is kept while a limit is off, and validated anyway, so turning it back on can't
    // reveal an error that was hidden.
    it.each(["closeAfter", "waitlistAfter"] as const)("validates %s's number whether or not it's on", (key) => {
      for (const enabled of [true, false]) {
        expect(issues({ [key]: { enabled, people: 0 } })).toEqual([[`${key}.people`, "Must be a whole number, 1 or more"]]);
      }
    });

    // NumberField maps a cleared input to NaN.
    it.each([NaN, 1.5, -1])("rejects %s people", (people) => {
      expect(issues({ closeAfter: { enabled: true, people } })).toEqual([["closeAfter.people", "Must be a whole number, 1 or more"]]);
    });

    it("accepts both limits on at once", () => {
      expect(issues({ waitlistAfter: { enabled: true, people: 240 }, closeAfter: { enabled: true, people: 400 } })).toEqual([]);
    });
  });

  // Blank leaves the date out of the lottery receipt.
  it.each(["", "2026-11-20"])("accepts a lottery results date of %j", (lotteryResultsDate) => {
    expect(issues({ lotteryResultsDate })).toEqual([]);
  });

  it("rejects a lottery results date that isn't a date", () => {
    expect(issues({ lotteryResultsDate: "November 20" })).toEqual([["lotteryResultsDate", "Must be a date"]]);
  });
});
