import { describe, it, expect } from "vitest";
import { waiversSchema } from "./schema";

describe("waiversSchema", () => {
  it("accepts the toggle with both DocuSeal fields filled in", () => {
    expect(waiversSchema.safeParse({ show: true, docusealTemplateId: "123", docuseal_key: "key" }).success).toBe(true);
  });

  // The DocuSeal fields are hidden while the toggle is off, but react-hook-form keeps a hidden
  // field's value and the form is always seeded with both, so they're present -- possibly blank.
  it("accepts blank DocuSeal fields", () => {
    expect(waiversSchema.safeParse({ show: false, docusealTemplateId: "", docuseal_key: "" }).success).toBe(true);
  });

  it("requires show to be a boolean", () => {
    expect(waiversSchema.safeParse({}).success).toBe(false);
    expect(waiversSchema.safeParse({ show: "yes" }).success).toBe(false);
  });
});
