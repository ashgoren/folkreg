import { z } from "zod";

const requiredNumber = (min: number) => z.number({ error: "Required" }).min(min);

// One flat shape for both processors: `processor` picks which set of keys is active, and the other
// set is kept as entered, so switching processors (even by accident) never discards credentials.
// The non-secret fields mirror PaymentsConfig; the snake_case ones are tenant_secrets columns.
export const paymentsSchema = z.object({
  processor: z.enum(["stripe", "paypal"]),
  stripePublishableKeyLive: z.string(),
  stripePublishableKeyTest: z.string(),
  statementDescriptorSuffix: z.string(),
  stripe_secret_key_live: z.string(),
  stripe_webhook_secret_live: z.string(),
  stripe_secret_key_test: z.string(),
  stripe_webhook_secret_test: z.string(),
  paypalClientIdLive: z.string(),
  paypalClientIdTest: z.string(),
  paypal_secret_live: z.string(),
  paypal_webhook_id_live: z.string(),
  paypal_secret_test: z.string(),
  paypal_webhook_id_test: z.string(),
  paymentDueDate: z.string(),
  directPaymentUrl: z.string(),
  coverFeesCheckbox: z.boolean(),
  showPaymentSummary: z.boolean(),
  deposit: z.object({
    enabled: z.boolean(),
    amount: requiredNumber(0),
  }),
  donation: z.object({
    enabled: z.boolean(),
    max: requiredNumber(0),
  }),
  checks: z.object({
    allowed: z.boolean(),
    showPostalAddress: z.boolean(),
    payee: z.string(),
    address: z.string(),
  }),
});

export type PaymentsValues = z.infer<typeof paymentsSchema>;
