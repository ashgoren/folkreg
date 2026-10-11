import { describe, it, expect } from "vitest";
import { defaultRegistrationConfig } from "./defaults";
import { registrationStatus, submissionMode } from "./registration-status";
import type { RegistrationConfig } from "./schemas";

// Open now by default, so each test's times and limits are what decide the status.
const registration = (overrides: Partial<RegistrationConfig> = {}): RegistrationConfig => ({
  ...defaultRegistrationConfig(),
  opening: "now",
  ...overrides,
});

// Times are on the event's clock: noon Pacific on November 1, 2026 (standard time) is 20:00Z.
const TIMEZONE = "America/Los_Angeles";
const at = (iso: string) => new Date(iso);
const status = (overrides: Partial<RegistrationConfig>, now: string, peopleRegistered: number | null = 0) =>
  registrationStatus({ registration: registration(overrides), timezone: TIMEZONE, now: at(now), peopleRegistered });

describe("registrationStatus", () => {
  it("is closed for a new tenant", () => {
    expect(registrationStatus({
      registration: defaultRegistrationConfig(), timezone: TIMEZONE, now: at("2026-11-01T20:00Z"), peopleRegistered: 0,
    })).toEqual({ state: "closed" });
  });

  it("is open now with no closing time or limits", () => {
    expect(status({}, "2026-11-01T20:00Z")).toEqual({ state: "open", closesAt: "" });
  });

  // Each value is kept while it doesn't apply, and ignored.
  it("is closed while not opened, whatever the stored times say", () => {
    expect(status({ opening: "closed", opensAt: "2026-11-01T12:00" }, "2026-11-02T20:00Z")).toEqual({ state: "closed" });
  });

  describe("scheduled opening", () => {
    const scheduled = (opensAt: string) => ({ opening: "scheduled" as const, opensAt });

    it("isn't open yet just before it, on the event's clock", () => {
      expect(status(scheduled("2026-11-01T12:00"), "2026-11-01T19:59:59Z")).toEqual({ state: "not-yet-open", opensAt: "2026-11-01T12:00" });
    });

    it("is open from that moment", () => {
      expect(status(scheduled("2026-11-01T12:00"), "2026-11-01T20:00Z")).toEqual({ state: "open", closesAt: "" });
    });

    // Daylight saving comes from the date: noon Pacific in July is 19:00Z, not 20:00Z.
    it("follows daylight saving", () => {
      expect(status(scheduled("2026-07-01T12:00"), "2026-07-01T19:00Z").state).toBe("open");
    });

    it("doesn't apply while open now", () => {
      expect(status({ opening: "now", opensAt: "2026-11-01T12:00" }, "2026-10-01T20:00Z").state).toBe("open");
    });
  });

  describe("closing time", () => {
    const closeAt = { enabled: true, at: "2026-11-15T12:00" };

    it("is open until it, reporting it", () => {
      expect(status({ closeAt }, "2026-11-15T19:59:59Z")).toEqual({ state: "open", closesAt: "2026-11-15T12:00" });
    });

    it("is closed from that moment", () => {
      expect(status({ closeAt }, "2026-11-15T20:00Z")).toEqual({ state: "past-closing-time", closesAt: "2026-11-15T12:00" });
    });

    it("doesn't apply while it's off, and isn't reported", () => {
      expect(status({ closeAt: { ...closeAt, enabled: false } }, "2026-11-16T20:00Z")).toEqual({ state: "open", closesAt: "" });
    });

    it("is open only between the two times with a scheduled opening", () => {
      const window = { opening: "scheduled" as const, opensAt: "2026-11-01T12:00", closeAt };
      expect(status(window, "2026-10-31T20:00Z").state).toBe("not-yet-open");
      expect(status(window, "2026-11-08T20:00Z").state).toBe("open");
      expect(status(window, "2026-11-16T20:00Z").state).toBe("past-closing-time");
    });
  });

  describe("people limit", () => {
    const closeAfter = { enabled: true, people: 400 };

    it("is open below it and full once it's reached", () => {
      expect(status({ closeAfter }, "2026-11-01T20:00Z", 399).state).toBe("open");
      expect(status({ closeAfter }, "2026-11-01T20:00Z", 400)).toEqual({ state: "full", people: 400 });
    });

    it("doesn't apply while it's off", () => {
      expect(status({ closeAfter: { enabled: false, people: 400 } }, "2026-11-01T20:00Z", 500).state).toBe("open");
    });

    // The admin can't count orders.
    it("is never reported as reached when the count is unknown", () => {
      expect(status({ closeAfter }, "2026-11-01T20:00Z", null).state).toBe("open");
    });
  });

  // Several limits at once report the first of: opening, closing time, people limit.
  it("reports the first reason that applies", () => {
    const all = {
      opening: "scheduled" as const,
      opensAt: "2026-11-01T12:00",
      closeAt: { enabled: true, at: "2026-11-15T12:00" },
      closeAfter: { enabled: true, people: 1 },
    };
    expect(status({ ...all, opening: "closed" }, "2026-11-16T20:00Z", 5).state).toBe("closed");
    expect(status(all, "2026-10-31T20:00Z", 5).state).toBe("not-yet-open");
    expect(status(all, "2026-11-16T20:00Z", 5).state).toBe("past-closing-time");
    expect(status(all, "2026-11-08T20:00Z", 5).state).toBe("full");
  });
});

describe("submissionMode", () => {
  it.each(["pay", "lottery", "waitlist"] as const)("is %s in that mode with no limit", (mode) => {
    expect(submissionMode({ registration: registration({ mode }), peopleNotWaitlisted: 1000 })).toBe(mode);
  });

  it("waitlists paid registrations once waitlistAfter people are registered", () => {
    const config = registration({ waitlistAfter: { enabled: true, people: 240 } });
    expect(submissionMode({ registration: config, peopleNotWaitlisted: 239 })).toBe("pay");
    expect(submissionMode({ registration: config, peopleNotWaitlisted: 240 })).toBe("waitlist");
  });

  it("ignores waitlistAfter while it's off", () => {
    expect(submissionMode({ registration: registration({ waitlistAfter: { enabled: false, people: 240 } }), peopleNotWaitlisted: 500 })).toBe("pay");
  });

  // Lottery entries and waitlist places are decided later, not by a count.
  it("ignores waitlistAfter outside pay mode", () => {
    expect(submissionMode({ registration: registration({ mode: "lottery", waitlistAfter: { enabled: true, people: 1 } }), peopleNotWaitlisted: 500 })).toBe("lottery");
  });
});
