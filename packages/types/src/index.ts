import { Tables, Database } from "./database.types"
import { type SupabaseClient } from "@supabase/supabase-js"
import type { AgeGroup, TenantConfig } from "@repo/tenant-config"

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
  age?: AgeGroup;
  share?: string[];
  misc?: string[];
  admission: number;
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

export interface LotteryInfo {
  status: 'registered' | 'selected' | 'invited' | 'waitlisted';
  tokenHash: string | null;
  invitedAt: string | null;
  expiresAt: string | null;
}

export type Order = Omit<Tables<'orders'>, 'people' | 'payments' | 'lottery'> & {
  people: Person[];
  payments: Payment[];
  lottery: LotteryInfo | null;
}

// Computed order/payment columns the spreadsheet sync writes alongside registrant
// fields -- not user-entered, so not part of the FieldDef catalog in @repo/fields.
// `waiver`/`deposit`/`donation`/`fees` are only relevant when the corresponding
// tenant feature is enabled; the rest always apply. `environment` is derived from
// `orders.is_live` at sync time.
export const SPREADSHEET_SYSTEM_COLUMNS = [
  'admission', 'donation', 'total', 'deposit', 'fees', 'paid', 'charged',
  'status', 'purchaser', 'completedAt', 'paymentId', 'paymentEmail',
  'waiver', 'environment',
] as const;

// A tenants row with its jsonb config columns typed (and, when read through createTenantDb's
// getTenant(), parsed) by the schemas in @repo/tenant-config.
export type Tenant = Omit<Tables<'tenants'>, keyof TenantConfig> & TenantConfig

export type TenantSecrets = Tables<'tenant_secrets'>
