import { describe, it, expect } from "vitest";
import { defaultRegistrationConfig } from "./defaults";
import { registrationStatus, submissionMode } from "./registration-status";
import type { RegistrationConfig } from "./schemas";

// Open by default, so each test's times and limits are what decide the status.
const registration = (overrides: Partial<RegistrationConfig> = {}): RegistrationConfig => ({
  ...defaultRegistrationConfig(),
  open: true,
  ...overrides,
});

// Times are on the event's clock: noon Pacific on November 1, 2026 (standard time) is 20:00Z.
const TIMEZONE = "America/Los_Angeles";
const at = (iso: string) => new Date(iso);
const status = (overrides: Partial<RegistrationConfig>, now: string, peopleRegistered: number | null = 0) =>
  registrationStatus(registration(overrides), TIMEZONE, at(now), peopleRegistered);

describe("registrationStatus", () => {
  it("is closed for a new tenant", () => {
    expect(registrationStatus(defaultRegistrationConfig(), TIMEZONE, at("2026-11-01T20:00Z"), 0)).toEqual({ state: "closed" });
  });

  it("is open with the switch on and no times or limits", () => {
    expect(status({}, "2026-11-01T20:00Z")).toEqual({ state: "open", closesAt: "" });
  });

  it("is closed while the switch is off, whatever the times say", () => {
    expect(status({ open: false, opensAt: "2026-11-01T12:00" }, "2026-11-02T20:00Z")).toEqual({ state: "closed" });
  });

  describe("opening time", () => {
    it("isn't open yet just before it, on the event's clock", () => {
      expect(status({ opensAt: "2026-11-01T12:00" }, "2026-11-01T19:59:59Z")).toEqual({ state: "not-yet-open", opensAt: "2026-11-01T12:00" });
    });

    it("is open from that moment", () => {
      expect(status({ opensAt: "2026-11-01T12:00" }, "2026-11-01T20:00Z")).toEqual({ state: "open", closesAt: "" });
    });

    // Daylight saving comes from the date: noon Pacific in July is 19:00Z, not 20:00Z.
    it("follows daylight saving", () => {
      expect(status({ opensAt: "2026-07-01T12:00" }, "2026-07-01T19:00Z").state).toBe("open");
    });
  });

  describe("closing time", () => {
    it("is open until it, reporting it", () => {
      expect(status({ closesAt: "2026-11-15T12:00" }, "2026-11-15T19:59:59Z")).toEqual({ state: "open", closesAt: "2026-11-15T12:00" });
    });

    it("is closed from that moment", () => {
      expect(status({ closesAt: "2026-11-15T12:00" }, "2026-11-15T20:00Z")).toEqual({ state: "past-closing-time", closesAt: "2026-11-15T12:00" });
    });

    it("is open only between the two times when both are set", () => {
      const window = { opensAt: "2026-11-01T12:00", closesAt: "2026-11-15T12:00" };
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

  // Several limits at once report the first of: switch, opening time, closing time, people limit.
  it("reports the first reason that applies", () => {
    const all = { opensAt: "2026-11-01T12:00", closesAt: "2026-11-15T12:00", closeAfter: { enabled: true, people: 1 } };
    expect(status({ ...all, open: false }, "2026-11-16T20:00Z", 5).state).toBe("closed");
    expect(status(all, "2026-10-31T20:00Z", 5).state).toBe("not-yet-open");
    expect(status(all, "2026-11-16T20:00Z", 5).state).toBe("past-closing-time");
    expect(status(all, "2026-11-08T20:00Z", 5).state).toBe("full");
  });
});

describe("submissionMode", () => {
  it.each(["pay", "lottery", "waitlist"] as const)("is %s in that mode with no limit", (mode) => {
    expect(submissionMode(registration({ mode }), 1000)).toBe(mode);
  });

  it("waitlists paid registrations once waitlistAfter people are registered", () => {
    const config = registration({ waitlistAfter: { enabled: true, people: 240 } });
    expect(submissionMode(config, 239)).toBe("pay");
    expect(submissionMode(config, 240)).toBe("waitlist");
  });

  it("ignores waitlistAfter while it's off", () => {
    expect(submissionMode(registration({ waitlistAfter: { enabled: false, people: 240 } }), 500)).toBe("pay");
  });

  // Lottery entries and waitlist places are decided later, not by a count.
  it("ignores waitlistAfter outside pay mode", () => {
    expect(submissionMode(registration({ mode: "lottery", waitlistAfter: { enabled: true, people: 1 } }), 500)).toBe("lottery");
  });
});
