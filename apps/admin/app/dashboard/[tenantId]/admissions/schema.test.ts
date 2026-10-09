import { describe, it, expect } from "vitest";
import { defaultAdmissionsConfig } from "@repo/tenant-config";
import type { AdmissionsConfig } from "@repo/types";
import { admissionsSchema } from "./schema";

// Every mode's values are always present; `mode` picks which one applies.
const base: AdmissionsConfig = {
  ...defaultAdmissionsConfig(),
  costRange: [20, 100],
  costDefault: 60,
  cost: 60,
  earlybirdCutoff: "2026-03-01",
  categories: [{ label: "Adult", ageGroups: ["adult"], early: 80, later: 100 }],
  waitlistCutoff: 200,
};
const slidingScale = { ...base, mode: "sliding-scale" as const };
const fixed = { ...base, mode: "fixed" as const };
const tiered = { ...base, mode: "tiered" as const };

const issuePaths = (value: unknown) =>
  admissionsSchema.safeParse(value).error?.issues.map((issue) => issue.path.join(".")) ?? [];

describe("admissionsSchema", () => {
  it.each([["sliding-scale", slidingScale], ["fixed", fixed], ["tiered", tiered]])("accepts a valid %s config", (_, value) => {
    expect(admissionsSchema.safeParse(value).success).toBe(true);
  });

  it("rejects an unknown mode", () => {
    expect(admissionsSchema.safeParse({ ...fixed, mode: "pay-what-you-want" }).success).toBe(false);
  });

  // The other modes' values are kept (so switching never loses them) and validated too: the form
  // only switches modes while the current one is valid, so a hidden mode is never left invalid.
  it("validates every mode's fields, whichever mode is active", () => {
    expect(issuePaths({ ...fixed, costRange: [NaN, 100] })).toEqual(["costRange.0"]);
    expect(issuePaths({ ...slidingScale, cost: NaN })).toEqual(["cost"]);
  });

  describe("sliding scale", () => {
    it.each([20, 60, 100])("accepts a default of %s within (or on the edge of) the range", (costDefault) => {
      expect(admissionsSchema.safeParse({ ...slidingScale, costDefault }).success).toBe(true);
    });

    it.each([19, 101])("rejects a default of %s outside the range, attached to costDefault", (costDefault) => {
      const result = admissionsSchema.safeParse({ ...slidingScale, costDefault });
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
      expect(admissionsSchema.safeParse({ ...slidingScale, costRange: [NaN, 100] }).success).toBe(false);
    });
  });

  describe("fixed", () => {
    it("accepts a free event", () => {
      expect(admissionsSchema.safeParse({ ...fixed, cost: 0 }).success).toBe(true);
    });

    it("rejects a cleared (NaN) cost", () => {
      expect(issuePaths({ ...fixed, cost: NaN })).toEqual(["cost"]);
    });
  });

  describe("tiered", () => {
    it("accepts no categories and a blank cutoff", () => {
      expect(admissionsSchema.safeParse({ ...tiered, categories: [], earlybirdCutoff: "" }).success).toBe(true);
    });

    it("accepts a category with every age group", () => {
      const category = { label: "Any", ageGroups: ["0-2", "3-5", "6-12", "13-17", "adult"], early: 0, later: 0 };
      expect(admissionsSchema.safeParse({ ...tiered, categories: [category] }).success).toBe(true);
    });

    it("rejects an unknown age group", () => {
      const category = { label: "Senior", ageGroups: ["65+"], early: 50, later: 60 };
      expect(issuePaths({ ...tiered, categories: [category] })).toEqual(["categories.0.ageGroups.0"]);
    });

    it("rejects a cleared (NaN) price on a category", () => {
      const category = { label: "Adult", ageGroups: ["adult"], early: NaN, later: 100 };
      expect(issuePaths({ ...tiered, categories: [category] })).toEqual(["categories.0.early"]);
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
      const result = admissionsSchema.safeParse({ ...fixed, admissionQuantityMax: NaN });
      expect(result.error?.issues[0]?.message).toBe("Required");
    });

    it("requires forceWaitlist", () => {
      expect(issuePaths({ ...fixed, forceWaitlist: undefined })).toEqual(["forceWaitlist"]);
    });
  });

  // Every new tenant is created with this, so it has to pass the same validation as anything an
  // organizer types -- in any mode, since switching keeps the other modes' starting values.
  it.each(["sliding-scale", "fixed", "tiered"] as const)("accepts the @repo/tenant-config default in %s mode", (mode) => {
    expect(admissionsSchema.safeParse({ ...defaultAdmissionsConfig(), mode }).success).toBe(true);
  });
});
