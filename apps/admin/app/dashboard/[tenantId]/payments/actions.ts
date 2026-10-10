"use server";

import { paymentsConfigSchema, type PaymentsConfig } from "@repo/tenant-config";
import { saveTenantConfig } from "@/lib/save-tenant-config";
import { paymentSecretsSchema, type PaymentSecretsValues } from "./schema";

// The Payments page saves its two tables separately, each only when it changed (see useSaveChangedParts).

export async function updatePayments(tenantId: string, config: PaymentsConfig): Promise<string | null> {
  return saveTenantConfig(tenantId, paymentsConfigSchema, config, (db, data) => db.updateTenant({ payments_config: data }));
}

export async function updatePaymentSecrets(tenantId: string, secrets: PaymentSecretsValues): Promise<string | null> {
  return saveTenantConfig(tenantId, paymentSecretsSchema, secrets, (db, data) =>
    // Unset is null in tenant_secrets.
    db.updateTenantSecrets(Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value || null]))),
  );
}
