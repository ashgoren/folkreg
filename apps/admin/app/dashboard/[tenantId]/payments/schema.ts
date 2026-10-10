import { z } from "zod";
import { paymentsConfigSchema } from "@repo/tenant-config";

// Both processors' credential secrets, which live in tenant_secrets and are saved by their own
// action (updatePaymentSecrets). Blank is "" here, null in the table.
export const paymentSecretsSchema = z.object({
  stripe_secret_key_live: z.string(),
  stripe_webhook_secret_live: z.string(),
  stripe_secret_key_test: z.string(),
  stripe_webhook_secret_test: z.string(),
  paypal_secret_live: z.string(),
  paypal_webhook_id_live: z.string(),
  paypal_secret_test: z.string(),
  paypal_webhook_id_test: z.string(),
});
export type PaymentSecretsValues = z.infer<typeof paymentSecretsSchema>;

// What the Payments form edits: payments_config and the secrets together. Both processors' values
// are always part of it, so switching processors (even by accident) never discards credentials.
export const paymentsSchema = paymentsConfigSchema.extend(paymentSecretsSchema.shape);
export type PaymentsValues = z.infer<typeof paymentsSchema>;
