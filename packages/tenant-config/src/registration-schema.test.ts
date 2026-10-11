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

  it.each(["closed", "now", "scheduled"] as const)("accepts opening %s", (opening) => {
    expect(issues({ opening, opensAt: "2026-11-01T12:00" })).toEqual([]);
  });

  describe("opening and closing times", () => {
    const closeAt = (at: string, enabled = true) => ({ enabled, at });

    // A time that doesn't apply may be blank; one that does is required.
    it.each([
      ["a blank opening time while not scheduled", { opening: "now" as const, opensAt: "" }, []],
      ["a blank closing time while it's off", { closeAt: closeAt("", false) }, []],
      ["a blank opening time while scheduled", { opening: "scheduled" as const, opensAt: "" }, [["opensAt", "Required"]]],
      ["a blank closing time while it's on", { closeAt: closeAt("") }, [["closeAt.at", "Required"]]],
    ])("checks %s", (_, values, expected) => {
      expect(issues(values)).toEqual(expected);
    });

    // A kept value is still checked for format, so switching back to it can't reveal a hidden error.
    it.each(["Nov 1 at noon", "2026-11-01", "2026-11-01T25:00"])("rejects an opening time of %j, scheduled or not", (opensAt) => {
      expect(issues({ opening: "now", opensAt })).toEqual([["opensAt", "Must be a date and time"]]);
      expect(issues({ opening: "scheduled", opensAt })).toEqual([["opensAt", "Must be a date and time"]]);
    });

    it("rejects a closing time that isn't a date and time, on or off", () => {
      expect(issues({ closeAt: closeAt("Nov 15", false) })).toEqual([["closeAt.at", "Must be a date and time"]]);
    });

    describe("with a scheduled opening and a closing time", () => {
      const window = (opensAt: string, at: string, enabled = true) => ({ opening: "scheduled" as const, opensAt, closeAt: closeAt(at, enabled) });

      it("rejects a closing time that isn't after the opening time, attached to the closing time", () => {
        expect(issues(window("2026-11-01T12:00", "2026-11-01T12:00"))).toEqual([["closeAt.at", "Must be after the opening time"]]);
        expect(issues(window("2026-11-01T12:00", "2026-10-31T12:00"))).toEqual([["closeAt.at", "Must be after the opening time"]]);
      });

      // A date-time input may give seconds or not; the same moment written both ways is equal.
      it("compares times written with and without seconds", () => {
        expect(issues(window("2026-11-01T12:00:00", "2026-11-01T12:00"))).toEqual([["closeAt.at", "Must be after the opening time"]]);
        expect(issues(window("2026-11-01T12:00", "2026-11-01T12:00:30"))).toEqual([]);
      });

      // Only times that both apply are compared, so a kept value can't block a save.
      it("doesn't compare them when either doesn't apply", () => {
        expect(issues(window("2026-11-01T12:00", "2026-10-31T12:00", false))).toEqual([]);
        expect(issues({ ...window("2026-11-01T12:00", "2026-10-31T12:00"), opening: "now" })).toEqual([]);
      });
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
