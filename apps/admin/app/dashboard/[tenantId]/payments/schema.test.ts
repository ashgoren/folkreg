import { describe, it, expect } from "vitest";
import { defaultPaymentsConfig } from "@repo/tenant-config";
import { paymentsSchema, type PaymentsValues } from "./schema";

// A new tenant's form values: the default payments_config plus blank secrets.
const blank: PaymentsValues = {
  ...defaultPaymentsConfig(),
  stripe_secret_key_live: "",
  stripe_webhook_secret_live: "",
  stripe_secret_key_test: "",
  stripe_webhook_secret_test: "",
  paypal_secret_live: "",
  paypal_webhook_id_live: "",
  paypal_secret_test: "",
  paypal_webhook_id_test: "",
};

describe("paymentsSchema", () => {
  it("accepts a new tenant's blank values, for either processor", () => {
    expect(paymentsSchema.safeParse(blank).success).toBe(true);
    expect(paymentsSchema.safeParse({ ...blank, processor: "paypal" }).success).toBe(true);
  });

  it("rejects an unknown processor", () => {
    expect(paymentsSchema.safeParse({ ...blank, processor: "square" }).success).toBe(false);
  });

  // Both processors' fields are part of the one shape, so the inactive processor's values reach
  // parsed.data (and get saved) instead of being dropped when the other processor is selected.
  it("keeps the inactive processor's fields in the parsed output", () => {
    const result = paymentsSchema.safeParse({ ...blank, processor: "paypal", stripe_secret_key_live: "sk_live", stripePublishableKeyLive: "pk_live" });
    expect(result.data).toMatchObject({ processor: "paypal", stripe_secret_key_live: "sk_live", stripePublishableKeyLive: "pk_live" });
  });

  // NumberField maps a cleared input to NaN, which fails validation with an inline "Required"
  // rather than saving -- the same as Admissions' prices.
  it("rejects a cleared (NaN) deposit amount or donation max as Required", () => {
    const result = paymentsSchema.safeParse({ ...blank, deposit: { enabled: true, amount: NaN }, donation: { enabled: true, max: NaN } });
    expect(result.error?.issues.map((issue) => [issue.path.join("."), issue.message])).toEqual([
      ["deposit.amount", "Required"],
      ["donation.max", "Required"],
    ]);
  });

  it("accepts zero and positive amounts", () => {
    expect(paymentsSchema.safeParse({ ...blank, deposit: { enabled: true, amount: 0 }, donation: { enabled: true, max: 250 } }).success).toBe(true);
  });

  it("rejects negative amounts", () => {
    expect(paymentsSchema.safeParse({ ...blank, deposit: { enabled: true, amount: -1 } }).success).toBe(false);
    expect(paymentsSchema.safeParse({ ...blank, donation: { enabled: true, max: -5 } }).success).toBe(false);
  });

  it("requires every checks sub-field", () => {
    expect(paymentsSchema.safeParse({ ...blank, checks: { allowed: true } }).success).toBe(false);
  });
});
