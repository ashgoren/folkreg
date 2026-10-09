"use server";

import { saveTenantConfig } from "@/lib/save-tenant-config";
import { paymentsSchema, type PaymentsValues } from "./schema";

export async function updatePayments(tenantId: string, values: PaymentsValues): Promise<string | null> {
  return saveTenantConfig(tenantId, paymentsSchema, values, async (db, data) => {
    // The credential secrets go to tenant_secrets, where an unset column is null; everything else
    // is payments_config as the form validated it. Both processors' values are saved whichever is
    // active, so nothing an organizer entered is lost by switching processors.
    const {
      stripe_secret_key_live, stripe_webhook_secret_live, stripe_secret_key_test, stripe_webhook_secret_test,
      paypal_secret_live, paypal_webhook_id_live, paypal_secret_test, paypal_webhook_id_test,
      ...config
    } = data;

    await db.updateTenant({ payments_config: config });
    await db.updateTenantSecrets({
      stripe_secret_key_live: stripe_secret_key_live || null,
      stripe_webhook_secret_live: stripe_webhook_secret_live || null,
      stripe_secret_key_test: stripe_secret_key_test || null,
      stripe_webhook_secret_test: stripe_webhook_secret_test || null,
      paypal_secret_live: paypal_secret_live || null,
      paypal_webhook_id_live: paypal_webhook_id_live || null,
      paypal_secret_test: paypal_secret_test || null,
      paypal_webhook_id_test: paypal_webhook_id_test || null,
    });
  });
}
