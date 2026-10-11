import { parseTenantConfig, type TenantConfig } from "@repo/tenant-config";
import type { DbClient, TablesUpdate, Tenant, TenantSecrets } from "@repo/types";
import { createOrderMethods } from "./orders";
import { TenantNotFoundError } from "./errors";

// The editable scalar columns plus the jsonb config columns, typed by their schemas rather than as
// generic Json. The config types are z.infer'd type aliases, which TypeScript accepts as Json
// as-is, so these values go to supabase-js without a cast.
type TenantUpdates = Pick<TablesUpdate<"tenants">, "slug" | "owner_id">
  & Partial<TenantConfig>;

type TenantSecretsUpdates = Partial<Omit<TenantSecrets, 'tenant_id'>>

// Which of a tenant's two credential sets applies, matching the _live/_test column suffixes. It
// follows the order rather than the tenant: the public's orders use the live keys, and a preview
// session's test orders the test keys.
export type PaymentMode = 'live' | 'test'

export type PaymentProcessorCredentials =
  | { processor: 'stripe'; secretKey: string; webhookSecret: string; publishableKey: string }
  | { processor: 'paypal'; clientId: string; secret: string; webhookId: string }

// tenant/secrets are already-fetched rows; mode picks which of their live/test variants applies
const resolvePaymentProcessorCredentials = (tenant: Tenant, secrets: TenantSecrets, mode: PaymentMode): PaymentProcessorCredentials => {
  const paymentsConfig = tenant.payments_config;

  const { processor } = paymentsConfig;
  const live = mode === 'live';

  if (processor === 'stripe') {
    const secretKey = live ? secrets.stripe_secret_key_live : secrets.stripe_secret_key_test;
    const webhookSecret = live ? secrets.stripe_webhook_secret_live : secrets.stripe_webhook_secret_test;
    const publishableKey = live ? paymentsConfig.stripePublishableKeyLive : paymentsConfig.stripePublishableKeyTest;
    if (!secretKey || !webhookSecret || !publishableKey) {
      throw new Error(`Tenant ${tenant.id} is missing Stripe ${mode} credentials`);
    }
    return { processor, secretKey, webhookSecret, publishableKey };
  }

  // processor is "stripe" | "paypal" (getTenant() parsed it), so anything else is PayPal.
  const secret = live ? secrets.paypal_secret_live : secrets.paypal_secret_test;
  const webhookId = live ? secrets.paypal_webhook_id_live : secrets.paypal_webhook_id_test;
  const clientId = live ? paymentsConfig.paypalClientIdLive : paymentsConfig.paypalClientIdTest;
  if (!secret || !webhookId || !clientId) {
    throw new Error(`Tenant ${tenant.id} is missing PayPal ${mode} credentials`);
  }
  return { processor, clientId, secret, webhookId };
}

export const getTenantBySlug = async (supabase: DbClient, slug: string) => {
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", slug)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
};

export const createTenantDb = (supabase: DbClient, tenantId: string) => {
  const getTenant = async () => {
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null; // No row found
      throw error; // Unexpected error
    }
    // The jsonb columns come back typed as generic Json; parsing checks each against its schema
    // (throwing if a row doesn't match) and gives them their real types.
    return { ...data, ...parseTenantConfig(tenantId, data) } satisfies Tenant;
  };

  const getSecrets = async () => {
    const { data, error } = await supabase
      .from("tenant_secrets")
      .select("*")
      .eq("tenant_id", tenantId)
      .single();
    if (error) throw error;
    return data as TenantSecrets;
  };

  // The caller supplies the mode: an order's (is_test), or a webhook endpoint's, since each mode
  // has its own webhook secret and the signature must be checked against the right one.
  const getPaymentProcessorCredentials = async (mode: PaymentMode) => {
    const [tenant, secrets] = await Promise.all([getTenant(), getSecrets()]);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
    return resolvePaymentProcessorCredentials(tenant, secrets, mode);
  };

  const updateTenant = async (updates: TenantUpdates) => {
    // .select() makes PostgREST return the updated rows, so an update that RLS (or a wrong id)
    // filtered down to nothing is detectable rather than indistinguishable from success.
    const { data, error } = await supabase
      .from("tenants")
      .update(updates)
      .eq("id", tenantId)
      .select("id");

    if (error) throw error;
    if (data.length === 0) throw new TenantNotFoundError(tenantId);
  };

  const updateTenantSecrets = async (secrets: TenantSecretsUpdates) => {
    // Same zero-rows check as updateTenant.
    const { data, error } = await supabase
      .from("tenant_secrets")
      .update(secrets)
      .eq("tenant_id", tenantId)
      .select("tenant_id");
    if (error) throw error;
    if (data.length === 0) throw new TenantNotFoundError(tenantId);
  };

  return {
    getTenant, getSecrets, getPaymentProcessorCredentials, updateTenant, updateTenantSecrets,
    ...createOrderMethods(supabase, tenantId),
  };
};
