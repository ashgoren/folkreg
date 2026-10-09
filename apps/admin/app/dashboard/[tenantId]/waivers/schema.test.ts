import { describe, it, expect } from "vitest";
import { waiversSchema } from "./schema";

describe("waiversSchema", () => {
  it("accepts the toggle with both DocuSeal fields filled in", () => {
    expect(waiversSchema.safeParse({ show: true, docusealTemplateId: "123", docuseal_key: "key" }).success).toBe(true);
  });

  // The DocuSeal fields are hidden in the UI while the toggle is off, so they may be absent.
  it("accepts the toggle alone, with DocuSeal fields omitted", () => {
    expect(waiversSchema.safeParse({ show: false }).success).toBe(true);
  });

  it("requires show to be a boolean", () => {
    expect(waiversSchema.safeParse({}).success).toBe(false);
    expect(waiversSchema.safeParse({ show: "yes" }).success).toBe(false);
  });
});
