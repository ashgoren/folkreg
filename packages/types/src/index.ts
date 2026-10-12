import { Tables, Database } from "./database.types"
import { type SupabaseClient } from "@supabase/supabase-js"
import type { TenantConfig, RegistrationConfig } from "@repo/tenant-config"

export * from "./database.types"

export type DbClient = SupabaseClient<Database>

export type PaymentMethod = 'stripe' | 'paypal' | 'check'

// Can add additional specific fields to avoid needing casting etc
export interface Person {
  first: string;
  last: string;
  nametag?: string;
  pronouns?: string;
  email: string;
  phone: string;
  address?: string;
  apartment?: string;
  city?: string;
  state?: string;
  zip?: string;
  age?: string; // one of the tenant's age field options
  share?: string[];
  misc?: string[];
  // Omitted until Payment computes a real value -- a stamped 0 placeholder would be indistinguishable
  // from a genuine free registration (e.g. a free age-tier).
  admission?: number;
  [key: string]: unknown;
}

export interface Payment {
  method: PaymentMethod;
  processorId: string | null;
  admissionAmount: number;
  donationAmount: number;
  feeAmount: number;
  charged: number;
  payerEmail: string | null;
  paidAt: string;
}

export type Order = Omit<Tables<'orders'>, 'people' | 'payments' | 'submission_mode'> & {
  people: Person[];
  payments: Payment[];
  // null until confirmRegistration sets it; the resolved outcome of submissionMode(), not a copy of
  // the tenant's configured registration_config.mode -- a pay-configured tenant can still resolve to
  // 'waitlist' once waitlistAfter trips.
  submission_mode: RegistrationConfig['mode'] | null;
}

// A tenants row with its jsonb config columns typed (and, when read through createTenantDb's
// getTenant(), parsed) by the schemas in @repo/tenant-config.
export type Tenant = Omit<Tables<'tenants'>, keyof TenantConfig> & TenantConfig

export type TenantSecrets = Tables<'tenant_secrets'>
