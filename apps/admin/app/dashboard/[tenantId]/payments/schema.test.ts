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

// The payments_config rules themselves are tested with paymentsConfigSchema in @repo/tenant-config;
// these cover what the form adds: the tenant_secrets fields.
describe("paymentsSchema", () => {
  it("accepts a new tenant's blank values, for either processor", () => {
    expect(paymentsSchema.safeParse(blank).success).toBe(true);
    expect(paymentsSchema.safeParse({ ...blank, processor: "paypal" }).success).toBe(true);
  });

  // Both processors' fields are part of the one shape, so the inactive processor's values reach
  // parsed.data (and get saved) instead of being dropped when the other processor is selected.
  it("keeps the inactive processor's fields in the parsed output", () => {
    const result = paymentsSchema.safeParse({ ...blank, processor: "paypal", stripe_secret_key_live: "sk_live", stripePublishableKeyLive: "pk_live" });
    expect(result.data).toMatchObject({ processor: "paypal", stripe_secret_key_live: "sk_live", stripePublishableKeyLive: "pk_live" });
  });
});
