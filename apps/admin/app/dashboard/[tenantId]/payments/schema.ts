import { z } from "zod";
import { paymentsConfigSchema } from "@repo/tenant-config";

// payments_config plus both processors' secrets, which the same form edits but which live in
// tenant_secrets. Both processors' values are always part of it, so switching processors (even by
// accident) never discards credentials.
export const paymentsSchema = paymentsConfigSchema.extend({
  stripe_secret_key_live: z.string(),
  stripe_webhook_secret_live: z.string(),
  stripe_secret_key_test: z.string(),
  stripe_webhook_secret_test: z.string(),
  paypal_secret_live: z.string(),
  paypal_webhook_id_live: z.string(),
  paypal_secret_test: z.string(),
  paypal_webhook_id_test: z.string(),
});

export type PaymentsValues = z.infer<typeof paymentsSchema>;
