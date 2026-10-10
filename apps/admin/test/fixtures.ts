// In-memory Tenant / TenantSecrets fixtures for component tests -- shaped exactly like what a
// config page's server component passes into its form, without touching the database.

import { defaultTenantConfig } from "@repo/tenant-config";
import type { Tenant, TenantSecrets } from "@repo/types";

export const TEST_TENANT_ID = "11111111-1111-4111-8111-111111111111";

// Every config column at its default, matching a freshly-created tenant, so each test spells
// out only the config it actually depends on.
export const makeTenant = (overrides: Partial<Tenant> = {}): Tenant => ({
  id: TEST_TENANT_ID,
  slug: "example",
  owner_id: null,
  is_live: false,
  show_preregistration: false,
  ...defaultTenantConfig(),
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

export const makeSecrets = (overrides: Partial<TenantSecrets> = {}): TenantSecrets => ({
  tenant_id: TEST_TENANT_ID,
  stripe_secret_key_live: null,
  stripe_webhook_secret_live: null,
  stripe_secret_key_test: null,
  stripe_webhook_secret_test: null,
  paypal_secret_live: null,
  paypal_webhook_id_live: null,
  paypal_secret_test: null,
  paypal_webhook_id_test: null,
  docuseal_key: null,
  ...overrides,
});
