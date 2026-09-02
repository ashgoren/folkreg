import { z } from "zod";

const optionalNumber = (min: number) => z.union([z.number().min(min), z.nan()]);

const sharedFields = {
  paymentDueDate: z.string(),
  directPaymentUrl: z.string(),
  coverFeesCheckbox: z.boolean(),
  showPaymentSummary: z.boolean(),
  deposit: z.object({
    enabled: z.boolean(),
    amount: optionalNumber(0),
  }),
  donation: z.object({
    enabled: z.boolean(),
    max: optionalNumber(0),
  }),
  checks: z.object({
    allowed: z.boolean(),
    showPostalAddress: z.boolean(),
    payee: z.string(),
    address: z.string(),
  }),
};

export const sharedSchema = z.object(sharedFields);
export type PaymentsSharedValues = z.infer<typeof sharedSchema>;

export const paymentsSchema = z.discriminatedUnion("processor", [
  z.object({
    processor: z.literal("stripe"),
    stripePublishableKeyLive: z.string(),
    stripePublishableKeyTest: z.string(),
    stripe_secret_key_live: z.string(),
    stripe_webhook_secret_live: z.string(),
    stripe_secret_key_test: z.string(),
    stripe_webhook_secret_test: z.string(),
    statementDescriptorSuffix: z.string(),
    ...sharedFields,
  }),
  z.object({
    processor: z.literal("paypal"),
    paypalClientIdLive: z.string(),
    paypalClientIdTest: z.string(),
    paypal_secret_live: z.string(),
    paypal_webhook_id_live: z.string(),
    paypal_secret_test: z.string(),
    paypal_webhook_id_test: z.string(),
    ...sharedFields,
  }),
]);

export type PaymentsValues = z.infer<typeof paymentsSchema>;
