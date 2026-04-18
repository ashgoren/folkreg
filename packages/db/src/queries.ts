import type { DbClient } from "./server.ts";
import type {
  Json,
  Tenant, TenantSecrets,
  EventConfig, RegistrationConfig, AdmissionsConfig, PaymentsConfig, SpreadsheetConfig, ThemeConfig,
  PaymentProcessor,
} from "@repo/types";

type TenantUpdates = Partial<{
  slug: string,
  domain: string,
  is_live: boolean,
  payment_processor: PaymentProcessor,
  owner_id: string,
  event_config: EventConfig,
  registration_config: RegistrationConfig,
  admissions_config: AdmissionsConfig,
  payments_config: PaymentsConfig,
  theme_config: ThemeConfig,
  spreadsheet_config: SpreadsheetConfig
}>

type TenantSecretsUpdates = Partial<Omit<TenantSecrets, 'tenant_id'>>

export const getTenantByDomain = async (supabase: DbClient, domain: string) => {
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", domain)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // No row found
    throw error; // Unexpected error
  }
  return data;
};

export const createTenantDb = (supabase: DbClient, tenantId: string) => {
  return {

    getTenant: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", tenantId)
        .single();
      if (error) {
        if (error.code === "PGRST116") return null; // No row found
        throw error; // Unexpected error
      }
      return data as Tenant;
    },

    getSecrets: async () => {
      const { data, error } = await supabase
        .from("tenant_secrets")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();
      if (error) throw error;
      return data as TenantSecrets;
    },

    updateTenant: async (updates: TenantUpdates) => {
      const { event_config, registration_config, admissions_config, payments_config, theme_config, spreadsheet_config, ...scalars } = updates;

      const payload = {
        ...scalars,
        ...(event_config !== undefined && { event_config: event_config as unknown as Json }),
        ...(registration_config !== undefined && { registration_config: registration_config as unknown as Json }),
        ...(admissions_config !== undefined && { admissions_config: admissions_config as unknown as Json }),
        ...(payments_config !== undefined && { payments_config: payments_config as unknown as Json }),
        ...(theme_config !== undefined && { theme_config: theme_config as unknown as Json }),
        ...(spreadsheet_config !== undefined && { spreadsheet_config: spreadsheet_config as unknown as Json }),
      };

      const { error } = await supabase
        .from("tenants")
        .update(payload)
        .eq("id", tenantId);

      if (error) throw error;
    },

    updateTenantSecrets: async (secrets: TenantSecretsUpdates) => {
      const { error } = await supabase
        .from("tenant_secrets")
        .update(secrets)
        .eq("tenant_id", tenantId);
      if (error) throw error;
    }
  };
};
