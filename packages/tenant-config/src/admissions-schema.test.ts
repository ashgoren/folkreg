import { describe, it, expect } from "vitest";
import { defaultAdmissionsConfig } from "./defaults";
import type { AdmissionsConfig } from "./schemas";
import { admissionsConfigSchema, priceAfterCutoff } from "./schemas";

// Every mode's values are always present; `mode` picks which one applies.
const base: AdmissionsConfig = {
  ...defaultAdmissionsConfig(),
  slidingScale: { min: 20, max: 100, default: 60 },
  fixed: { price: 60 },
  tiered: { earlybirdCutoff: "2026-03-01", lateIncrease: 15, prices: [{ ageGroup: "adult", options: [{ label: "Basic", price: 80 }] }] },
  waitlist: { when: "when-full", capacity: 200 },
};
// A config with some of one mode's values changed.
const withSlidingScale = (values: object) => ({ ...base, mode: "sliding-scale" as const, slidingScale: { ...base.slidingScale, ...values } });
const withTiered = (values: object) => ({ ...base, mode: "tiered" as const, tiered: { ...base.tiered, ...values } });
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
    expect(issuePaths({ ...fixed, slidingScale: { ...base.slidingScale, min: NaN } })).toEqual(["slidingScale.min"]);
    expect(issuePaths({ ...slidingScale, fixed: { price: NaN } })).toEqual(["fixed.price"]);
  });

  describe("sliding scale", () => {
    it.each([20, 60, 100])("accepts a default of %s within (or on the edge of) the range", (amount) => {
      expect(issuePaths(withSlidingScale({ default: amount }))).toEqual([]);
    });

    it.each([19, 101])("rejects a default of %s outside the range, attached to it", (amount) => {
      const result = admissionsConfigSchema.safeParse(withSlidingScale({ default: amount }));
      expect(result.error?.issues.map((issue) => [issue.path.join("."), issue.message]))
        .toEqual([["slidingScale.default", "Must be between minimum and maximum"]]);
    });

    it("rejects negative amounts", () => {
      expect(issuePaths(withSlidingScale({ min: -1 }))).toContain("slidingScale.min");
    });

    // NumberField maps a cleared input to NaN; it has to fail validation (inline "Required")
    // rather than saving.
    it("rejects a cleared (NaN) range bound", () => {
      expect(issuePaths(withSlidingScale({ min: NaN }))).toContain("slidingScale.min");
    });
  });

  describe("fixed", () => {
    it("accepts a free event", () => {
      expect(issuePaths({ ...fixed, fixed: { price: 0 } })).toEqual([]);
    });

    it("rejects a cleared (NaN) price", () => {
      expect(issuePaths({ ...fixed, fixed: { price: NaN } })).toEqual(["fixed.price"]);
    });
  });

  describe("tiered", () => {
    // Blank means no early-bird period at all.
    it.each(["", "2027-09-01", "2028-02-29"])("accepts a cutoff of %j", (earlybirdCutoff) => {
      expect(issuePaths(withTiered({ earlybirdCutoff }))).toEqual([]);
    });

    it.each(["Nov 10", "2027-9-1", "2027-13-01", "2027-02-29"])("rejects a cutoff of %j", (earlybirdCutoff) => {
      const result = admissionsConfigSchema.safeParse(withTiered({ earlybirdCutoff }));
      expect(result.error?.issues.map((issue) => [issue.path.join("."), issue.message])).toEqual([["tiered.earlybirdCutoff", "Must be a date"]]);
    });

    it("accepts no prices and a blank cutoff", () => {
      expect(issuePaths(withTiered({ prices: [], earlybirdCutoff: "" }))).toEqual([]);
    });

    // Age groups are the tenant's own age field options, defined on the Fields page.
    it("accepts prices for any age group the tenant defines, labeled or not", () => {
      const prices = [{ ageGroup: "65+", options: [{ label: "", price: 50 }] }, { ageGroup: "under-30", options: [] }];
      expect(issuePaths(withTiered({ prices }))).toEqual([]);
    });

    it("rejects an age group listed twice", () => {
      const prices = [{ ageGroup: "adult", options: [] }, { ageGroup: "adult", options: [] }];
      expect(issuePaths(withTiered({ prices }))).toEqual(["tiered.prices"]);
    });

    it.each([NaN, -1])("rejects a price of %s", (price) => {
      expect(issuePaths(withTiered({ prices: [{ ageGroup: "adult", options: [{ label: "", price }] }] })))
        .toEqual(["tiered.prices.0.options.0.price"]);
    });

    it.each([NaN, -1])("rejects a late increase of %s", (lateIncrease) => {
      expect(issuePaths(withTiered({ lateIncrease }))).toEqual(["tiered.lateIncrease"]);
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



    it("uses the Required message for a cleared number", () => {
      const result = admissionsConfigSchema.safeParse({ ...fixed, admissionQuantityMax: NaN });
      expect(result.error?.issues[0]?.message).toBe("Required");
    });

  });

  describe("waitlist", () => {
    it.each(["never", "when-full", "now"] as const)("accepts %s", (when) => {
      expect(issuePaths({ ...fixed, waitlist: { when, capacity: 50 } })).toEqual([]);
    });

    it("rejects any other choice", () => {
      expect(issuePaths({ ...fixed, waitlist: { when: "sometimes", capacity: 50 } })).toEqual(["waitlist.when"]);
    });

    // Kept whichever is chosen, so it's always checked.
    it.each([0, 2.5, NaN])("rejects a capacity of %s, whichever is chosen", (capacity) => {
      const result = admissionsConfigSchema.safeParse({ ...fixed, waitlist: { when: "never", capacity } });
      expect(result.error?.issues.map((issue) => [issue.path.join("."), issue.message]))
        .toEqual([["waitlist.capacity", "Must be a whole number, 1 or more"]]);
    });
  });
});
