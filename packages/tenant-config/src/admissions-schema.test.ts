import { describe, it, expect } from "vitest";
import { defaultAdmissionsConfig } from "./defaults";
import type { AdmissionsConfig } from "./schemas";
import { admissionsConfigSchema, priceAfterCutoff } from "./schemas";

// Every mode's values are always present; `mode` picks which one applies.
const base: AdmissionsConfig = {
  ...defaultAdmissionsConfig(),
  costRange: [20, 100],
  costDefault: 60,
  cost: 60,
  earlybirdCutoff: "2026-03-01",
  lateIncrease: 15,
  prices: [{ ageGroup: "adult", options: [{ label: "Basic", price: 80 }] }],
  waitlistCutoff: 200,
};
const slidingScale = { ...base, mode: "sliding-scale" as const };
const fixed = { ...base, mode: "fixed" as const };
const tiered = { ...base, mode: "tiered" as const };

const issuePaths = (value: unknown) =>
  admissionsConfigSchema.safeParse(value).error?.issues.map((issue) => issue.path.join(".")) ?? [];

describe("admissionsConfigSchema", () => {
  it.each([["sliding-scale", slidingScale], ["fixed", fixed], ["tiered", tiered]])("accepts a valid %s config", (_, value) => {
    expect(admissionsConfigSchema.safeParse(value).success).toBe(true);
  });

  it("rejects an unknown mode", () => {
    expect(admissionsConfigSchema.safeParse({ ...fixed, mode: "pay-what-you-want" }).success).toBe(false);
  });

  // The other modes' values are kept (so switching never loses them) and validated too: the form
  // only switches modes while the current one is valid, so a hidden mode is never left invalid.
  it("validates every mode's fields, whichever mode is active", () => {
    expect(issuePaths({ ...fixed, costRange: [NaN, 100] })).toEqual(["costRange.0"]);
    expect(issuePaths({ ...slidingScale, cost: NaN })).toEqual(["cost"]);
  });

  describe("sliding scale", () => {
    it.each([20, 60, 100])("accepts a default of %s within (or on the edge of) the range", (costDefault) => {
      expect(admissionsConfigSchema.safeParse({ ...slidingScale, costDefault }).success).toBe(true);
    });

    it.each([19, 101])("rejects a default of %s outside the range, attached to costDefault", (costDefault) => {
      const result = admissionsConfigSchema.safeParse({ ...slidingScale, costDefault });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.path).toEqual(["costDefault"]);
      expect(result.error?.issues[0]?.message).toBe("Must be between minimum and maximum");
    });

    it("rejects negative costs", () => {
      expect(issuePaths({ ...slidingScale, costRange: [-1, 100] })).toContain("costRange.0");
    });

    // NumberField maps a cleared input to NaN; it has to fail validation (inline "Required")
    // rather than saving.
    it("rejects a cleared (NaN) range bound", () => {
      expect(admissionsConfigSchema.safeParse({ ...slidingScale, costRange: [NaN, 100] }).success).toBe(false);
    });
  });

  describe("fixed", () => {
    it("accepts a free event", () => {
      expect(admissionsConfigSchema.safeParse({ ...fixed, cost: 0 }).success).toBe(true);
    });

    it("rejects a cleared (NaN) cost", () => {
      expect(issuePaths({ ...fixed, cost: NaN })).toEqual(["cost"]);
    });
  });

  describe("tiered", () => {
    it("accepts no prices and a blank cutoff", () => {
      expect(issuePaths({ ...tiered, prices: [], earlybirdCutoff: "" })).toEqual([]);
    });

    // Age groups are the tenant's own age field options, defined on the Fields page.
    it("accepts prices for any age group the tenant defines, labeled or not", () => {
      const prices = [{ ageGroup: "65+", options: [{ label: "", price: 50 }] }, { ageGroup: "under-30", options: [] }];
      expect(issuePaths({ ...tiered, prices })).toEqual([]);
    });

    it("rejects an age group listed twice", () => {
      const prices = [{ ageGroup: "adult", options: [] }, { ageGroup: "adult", options: [] }];
      expect(issuePaths({ ...tiered, prices })).toEqual(["prices"]);
    });

    it.each([NaN, -1])("rejects a price of %s", (price) => {
      expect(issuePaths({ ...tiered, prices: [{ ageGroup: "adult", options: [{ label: "", price }] }] }))
        .toEqual(["prices.0.options.0.price"]);
    });

    it.each([NaN, -1])("rejects a late increase of %s", (lateIncrease) => {
      expect(issuePaths({ ...tiered, lateIncrease })).toEqual(["lateIncrease"]);
    });
  });

  describe("priceAfterCutoff", () => {
    it("adds the late increase", () => {
      expect(priceAfterCutoff(340, 15)).toBe(355);
    });

    // E.g. the youngest attend free whenever they register.
    it("keeps a free price free", () => {
      expect(priceAfterCutoff(0, 15)).toBe(0);
    });
  });

  describe("shared fields", () => {
    // admissionQuantityMax is a deliberate presence-check exception: every registration
    // needs some per-order cap.
    it.each([0, 1.5, NaN])("rejects admissionQuantityMax of %s", (admissionQuantityMax) => {
      expect(issuePaths({ ...fixed, admissionQuantityMax })).toEqual(["admissionQuantityMax"]);
    });

    it.each([0, 2.5, NaN])("rejects waitlistCutoff of %s", (waitlistCutoff) => {
      expect(issuePaths({ ...fixed, waitlistCutoff })).toEqual(["waitlistCutoff"]);
    });

    it("uses the Required message for a cleared number", () => {
      const result = admissionsConfigSchema.safeParse({ ...fixed, admissionQuantityMax: NaN });
      expect(result.error?.issues[0]?.message).toBe("Required");
    });

    it("requires forceWaitlist", () => {
      expect(issuePaths({ ...fixed, forceWaitlist: undefined })).toEqual(["forceWaitlist"]);
    });
  });
});
