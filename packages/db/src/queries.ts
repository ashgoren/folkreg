import { parseTenantConfig, type TenantConfig } from "@repo/tenant-config";
import type { DbClient, TablesUpdate, Tenant, TenantSecrets } from "@repo/types";
import { createOrderMethods } from "./orders";
import { TenantNotFoundError } from "./errors";

// The editable scalar columns plus the jsonb config columns, typed by their schemas rather than as
// generic Json. The config types are z.infer'd type aliases, which TypeScript accepts as Json
// as-is, so these values go to supabase-js without a cast.
type TenantUpdates = Pick<TablesUpdate<"tenants">, "slug" | "is_live" | "show_preregistration" | "owner_id">
  & Partial<TenantConfig>;

type TenantSecretsUpdates = Partial<Omit<TenantSecrets, 'tenant_id'>>

export type PaymentProcessorCredentials =
  | { processor: 'stripe'; secretKey: string; webhookSecret: string; publishableKey: string }
  | { processor: 'paypal'; clientId: string; secret: string; webhookId: string }

// tenant/secrets are already-fetched rows; is_live picks which live/test variant is "active"
const resolvePaymentProcessorCredentials = (tenant: Tenant, secrets: TenantSecrets): PaymentProcessorCredentials => {
  const paymentsConfig = tenant.payments_config;

  const { processor } = paymentsConfig;
  const mode = tenant.is_live ? 'live' : 'test';

  if (processor === 'stripe') {
    const secretKey = tenant.is_live ? secrets.stripe_secret_key_live : secrets.stripe_secret_key_test;
    const webhookSecret = tenant.is_live ? secrets.stripe_webhook_secret_live : secrets.stripe_webhook_secret_test;
    const publishableKey = tenant.is_live ? paymentsConfig.stripePublishableKeyLive : paymentsConfig.stripePublishableKeyTest;
    if (!secretKey || !webhookSecret || !publishableKey) {
      throw new Error(`Tenant ${tenant.id} is missing Stripe ${mode} credentials`);
    }
    return { processor, secretKey, webhookSecret, publishableKey };
  }

  // processor is "stripe" | "paypal" (getTenant() parsed it), so anything else is PayPal.
  const secret = tenant.is_live ? secrets.paypal_secret_live : secrets.paypal_secret_test;
  const webhookId = tenant.is_live ? secrets.paypal_webhook_id_live : secrets.paypal_webhook_id_test;
  const clientId = tenant.is_live ? paymentsConfig.paypalClientIdLive : paymentsConfig.paypalClientIdTest;
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

  const getPaymentProcessorCredentials = async () => {
    const [tenant, secrets] = await Promise.all([getTenant(), getSecrets()]);
    if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
    return resolvePaymentProcessorCredentials(tenant, secrets);
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
