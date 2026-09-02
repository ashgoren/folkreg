"use server";

import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import type { PaymentsConfig } from "@repo/types";
import { paymentsSchema, type PaymentsValues } from "./schema";

export async function updatePayments(tenantId: string, values: PaymentsValues): Promise<string | null> {
  const parsed = paymentsSchema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return "Not authenticated";

  const db = createTenantDb(supabase, tenantId);
  const data = parsed.data;

  const stripeConfigFields = data.processor === "stripe"
    ? {
        stripePublishableKeyLive: data.stripePublishableKeyLive || null,
        stripePublishableKeyTest: data.stripePublishableKeyTest || null,
        statementDescriptorSuffix: data.statementDescriptorSuffix || null,
      }
    : { stripePublishableKeyLive: null, stripePublishableKeyTest: null, statementDescriptorSuffix: null };

  const paypalConfigFields = data.processor === "paypal"
    ? { paypalClientIdLive: data.paypalClientIdLive || null, paypalClientIdTest: data.paypalClientIdTest || null }
    : { paypalClientIdLive: null, paypalClientIdTest: null };

  const payments_config: PaymentsConfig = {
    processor: data.processor,
    ...stripeConfigFields,
    ...paypalConfigFields,
    paymentDueDate: data.paymentDueDate || null,
    directPaymentUrl: data.directPaymentUrl || null,
    coverFeesCheckbox: data.coverFeesCheckbox,
    showPaymentSummary: data.showPaymentSummary,
    deposit: {
      enabled: data.deposit.enabled,
      amount: Number.isNaN(data.deposit.amount) ? 0 : data.deposit.amount,
    },
    donation: {
      enabled: data.donation.enabled,
      max: Number.isNaN(data.donation.max) ? 0 : data.donation.max,
    },
    checks: {
      allowed: data.checks.allowed,
      showPostalAddress: data.checks.showPostalAddress,
      payee: data.checks.payee || undefined,
      address: data.checks.address || undefined,
    },
  };

  await db.updateTenant({ payments_config });

  const stripeSecrets = data.processor === "stripe"
    ? {
        stripe_secret_key_live: data.stripe_secret_key_live || null,
        stripe_webhook_secret_live: data.stripe_webhook_secret_live || null,
        stripe_secret_key_test: data.stripe_secret_key_test || null,
        stripe_webhook_secret_test: data.stripe_webhook_secret_test || null,
      }
    : { stripe_secret_key_live: null, stripe_webhook_secret_live: null, stripe_secret_key_test: null, stripe_webhook_secret_test: null };

  const paypalSecrets = data.processor === "paypal"
    ? {
        paypal_secret_live: data.paypal_secret_live || null,
        paypal_webhook_id_live: data.paypal_webhook_id_live || null,
        paypal_secret_test: data.paypal_secret_test || null,
        paypal_webhook_id_test: data.paypal_webhook_id_test || null,
      }
    : { paypal_secret_live: null, paypal_webhook_id_live: null, paypal_secret_test: null, paypal_webhook_id_test: null };

  await db.updateTenantSecrets({ ...stripeSecrets, ...paypalSecrets });

  return null;
}
