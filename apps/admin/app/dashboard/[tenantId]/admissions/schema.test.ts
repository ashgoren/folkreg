import { describe, it, expect } from "vitest";
import { admissionsSchema } from "./schema";

const shared = { admissionQuantityMax: 4, waitlistCutoff: 200, forceWaitlist: false };

const slidingScale = { mode: "sliding-scale" as const, costRange: [20, 100] as [number, number], costDefault: 60, ...shared };
const fixed = { mode: "fixed" as const, cost: 60, ...shared };
const tiered = {
  mode: "tiered" as const,
  earlybirdCutoff: "2026-03-01",
  categories: [{ label: "Adult", ageGroups: ["adult" as const], early: 80, later: 100 }],
  ...shared,
};

const issuePaths = (value: unknown) =>
  admissionsSchema.safeParse(value).error?.issues.map((issue) => issue.path.join(".")) ?? [];

describe("admissionsSchema", () => {
  it.each([["sliding-scale", slidingScale], ["fixed", fixed], ["tiered", tiered]])("accepts a valid %s config", (_, value) => {
    expect(admissionsSchema.safeParse(value).success).toBe(true);
  });

  it("rejects an unknown mode", () => {
    expect(admissionsSchema.safeParse({ ...fixed, mode: "pay-what-you-want" }).success).toBe(false);
  });

  // The union discriminates on `mode`, so each branch's own fields are required for that
  // mode -- a fixed config can't be saved as sliding-scale just by flipping the mode.
  it("requires each mode's own fields", () => {
    expect(admissionsSchema.safeParse({ ...fixed, mode: "sliding-scale" }).success).toBe(false);
    expect(admissionsSchema.safeParse({ ...slidingScale, mode: "fixed" }).success).toBe(false);
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
});
