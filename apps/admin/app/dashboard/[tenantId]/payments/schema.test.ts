import { describe, it, expect } from "vitest";
import { paymentsSchema, sharedSchema, type PaymentsSharedValues } from "./schema";

const shared: PaymentsSharedValues = {
  paymentDueDate: "",
  directPaymentUrl: "",
  coverFeesCheckbox: false,
  showPaymentSummary: true,
  deposit: { enabled: false, amount: NaN },
  donation: { enabled: false, max: NaN },
  checks: { allowed: false, showPostalAddress: false, payee: "", address: "" },
};

const stripe = {
  processor: "stripe" as const,
  stripePublishableKeyLive: "",
  stripePublishableKeyTest: "",
  stripe_secret_key_live: "",
  stripe_webhook_secret_live: "",
  stripe_secret_key_test: "",
  stripe_webhook_secret_test: "",
  statementDescriptorSuffix: "",
  ...shared,
};

const paypal = {
  processor: "paypal" as const,
  paypalClientIdLive: "",
  paypalClientIdTest: "",
  paypal_secret_live: "",
  paypal_webhook_id_live: "",
  paypal_secret_test: "",
  paypal_webhook_id_test: "",
  ...shared,
};

describe("paymentsSchema", () => {
  it("accepts a blank Stripe config", () => {
    expect(paymentsSchema.safeParse(stripe).success).toBe(true);
  });

  it("accepts a blank PayPal config", () => {
    expect(paymentsSchema.safeParse(paypal).success).toBe(true);
  });

  it("rejects an unknown processor", () => {
    expect(paymentsSchema.safeParse({ ...stripe, processor: "square" }).success).toBe(false);
  });

  it("requires the active processor's own credential fields", () => {
    expect(paymentsSchema.safeParse({ ...stripe, processor: "paypal" }).success).toBe(false);
    expect(paymentsSchema.safeParse({ ...paypal, processor: "stripe" }).success).toBe(false);
  });

  // z.object strips unknown keys, so the inactive processor's fields never reach parsed.data --
  // which is what the action builds its writes from.
  it("strips the inactive processor's fields from the parsed output", () => {
    const result = paymentsSchema.safeParse({ ...paypal, stripe_secret_key_live: "sk_live_leftover", statementDescriptorSuffix: "X" });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("stripe_secret_key_live");
    expect(result.data).not.toHaveProperty("statementDescriptorSuffix");
  });

  // NumberField maps a cleared input to NaN. For deposit/donation amounts that's a valid
  // "not set" value (the action stores 0), unlike Admissions' required numbers.
  it("accepts NaN for a cleared deposit amount or donation max", () => {
    expect(paymentsSchema.safeParse({ ...stripe, deposit: { enabled: true, amount: NaN }, donation: { enabled: true, max: NaN } }).success).toBe(true);
  });

  it("accepts zero and positive amounts", () => {
    expect(paymentsSchema.safeParse({ ...stripe, deposit: { enabled: true, amount: 0 }, donation: { enabled: true, max: 250 } }).success).toBe(true);
  });

  it("rejects negative amounts", () => {
    expect(paymentsSchema.safeParse({ ...stripe, deposit: { enabled: true, amount: -1 } }).success).toBe(false);
    expect(paymentsSchema.safeParse({ ...stripe, donation: { enabled: true, max: -5 } }).success).toBe(false);
  });

  it("requires every checks sub-field", () => {
    expect(paymentsSchema.safeParse({ ...stripe, checks: { allowed: true } }).success).toBe(false);
  });
});

describe("sharedSchema", () => {
  // PaymentsForm uses sharedSchema.parse() to carry processor-independent settings across a
  // processor switch, so it has to drop every processor-specific key.
  it("extracts only the processor-independent fields", () => {
    expect(sharedSchema.parse({ ...stripe, deposit: { enabled: true, amount: 25 } })).toEqual({ ...shared, deposit: { enabled: true, amount: 25 } });
    expect(sharedSchema.parse(paypal)).toEqual(shared);
  });
});
