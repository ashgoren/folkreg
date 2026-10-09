import { describe, it, expect } from "vitest";
import { receiptsConfigSchema } from "./schemas";

describe("receiptsConfigSchema", () => {
  it("accepts valid email addresses", () => {
    expect(receiptsConfigSchema.safeParse({ emailFrom: "reg@example.org", emailReplyTo: "info@example.org" }).success).toBe(true);
  });

  // Format-only, not presence-only: a page filled out across several sessions has to be
  // saveable with blanks, so "" is explicitly allowed alongside a valid email.
  it("accepts blank addresses", () => {
    expect(receiptsConfigSchema.safeParse({ emailFrom: "", emailReplyTo: "" }).success).toBe(true);
  });

  it("rejects malformed addresses with a readable message", () => {
    const result = receiptsConfigSchema.safeParse({ emailFrom: "not-an-email", emailReplyTo: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["emailFrom"]);
    expect(result.error?.issues[0]?.message).toBe("Must be a valid email");
  });

  it("rejects whitespace-only input rather than treating it as blank", () => {
    expect(receiptsConfigSchema.safeParse({ emailFrom: " ", emailReplyTo: "" }).success).toBe(false);
  });
});
