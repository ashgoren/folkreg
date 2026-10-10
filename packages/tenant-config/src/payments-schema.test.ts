import { describe, it, expect } from "vitest";
import { defaultPaymentsConfig } from "./defaults";
import { paymentsConfigSchema } from "./schemas";

const blank = defaultPaymentsConfig();

describe("paymentsConfigSchema", () => {
  it("accepts either processor", () => {
    expect(paymentsConfigSchema.safeParse(blank).success).toBe(true);
    expect(paymentsConfigSchema.safeParse({ ...blank, processor: "paypal" }).success).toBe(true);
  });

  it("rejects an unknown processor", () => {
    expect(paymentsConfigSchema.safeParse({ ...blank, processor: "square" }).success).toBe(false);
  });

  // NumberField maps a cleared input to NaN, which fails validation with an inline "Required"
  // rather than saving -- the same as Admissions' prices.
  it("rejects a cleared (NaN) deposit amount or donation max as Required", () => {
    const result = paymentsConfigSchema.safeParse({ ...blank, deposit: { enabled: true, amount: NaN }, donation: { enabled: true, max: NaN } });
    expect(result.error?.issues.map((issue) => [issue.path.join("."), issue.message])).toEqual([
      ["deposit.amount", "Required"],
      ["donation.max", "Required"],
    ]);
  });

  it("accepts zero and positive amounts", () => {
    expect(paymentsConfigSchema.safeParse({ ...blank, deposit: { enabled: true, amount: 0 }, donation: { enabled: true, max: 250 } }).success).toBe(true);
  });

  it("rejects negative amounts", () => {
    expect(paymentsConfigSchema.safeParse({ ...blank, deposit: { enabled: true, amount: -1 } }).success).toBe(false);
    expect(paymentsConfigSchema.safeParse({ ...blank, donation: { enabled: true, max: -5 } }).success).toBe(false);
  });

  it("requires every checks sub-field", () => {
    expect(paymentsConfigSchema.safeParse({ ...blank, checks: { allowed: true } }).success).toBe(false);
  });

  it.each(["", "https://www.paypal.com/paypalme/example"])("accepts a direct payment link of %j", (directPaymentUrl) => {
    expect(paymentsConfigSchema.safeParse({ ...blank, directPaymentUrl }).success).toBe(true);
  });

  // Without "https://", the link would point at a page on the registration site itself.
  it("rejects a direct payment link that isn't a web address", () => {
    const result = paymentsConfigSchema.safeParse({ ...blank, directPaymentUrl: "paypal.me/example" });
    expect(result.error?.issues.map((issue) => [issue.path.join("."), issue.message]))
      .toEqual([["directPaymentUrl", "Must be a web address starting with https://"]]);
  });
});
