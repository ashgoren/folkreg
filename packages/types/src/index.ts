import { Tables, Database } from "./database.types"
import { type SupabaseClient } from "@supabase/supabase-js"

export * from "./database.types"

export type DbClient = SupabaseClient<Database>

export type PaymentProcessor = 'stripe' | 'paypal'
export type PaymentMethod = 'stripe' | 'paypal' | 'check'

export type AgeGroup = '0-2' | '3-5' | '6-12' | '13-17' | 'adult'

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

// The jsonb config shapes below store unset text as "" and keep every key present, the same
// values the admin forms edit -- so a form can be seeded straight from its stored config and save
// what it validated, with no null/"" conversion in either direction. (tenant_secrets, a regular
// table, uses null for an unset column.)

export interface EventConfig {
  title: string;
  year: number;
  location: string;
  date: string;
  timezone: string;
  calendar: {
    title: string;
    description: string;
    location: string;
    start: string;
    end: string;
  };
  contacts: {
    info: string;
    housing: string;
  };
  links: {
    info: string;
    health: string;
    safety: string;
  };
}

export interface FieldConfig {
  title?: string;
  label?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string;
  rows?: number;
  width?: number;
  required?: boolean;
  includeOnNametag?: boolean;
}

export interface FieldsConfig {
  contactOrder: string[];
  miscOrder: string[];
  config: Record<string, FieldConfig>;
}

export interface WaiverConfig {
  show: boolean;
  docusealTemplateId: string;
}

export interface TieredCategory {
  label: string;
  ageGroups: AgeGroup[];
  early: number;
  later: number;
}

// Every pricing mode's values are kept regardless of which is active, so switching `mode` (even by
// accident) never discards prices or categories an organizer entered for another mode.
export interface AdmissionsConfig {
  mode: 'sliding-scale' | 'fixed' | 'tiered';
  // sliding-scale
  costRange: [number, number];
  costDefault: number;
  // fixed
  cost: number;
  // tiered
  earlybirdCutoff: string;
  categories: TieredCategory[];
  admissionQuantityMax: number;
  waitlistCutoff: number;
  forceWaitlist: boolean;
}

// Both processors' public keys are kept regardless of which is active, so switching `processor`
// (even by accident) never discards what an organizer entered for the other one.
export interface PaymentsConfig {
  processor: PaymentProcessor;
  stripePublishableKeyLive: string;
  stripePublishableKeyTest: string;
  paypalClientIdLive: string;
  paypalClientIdTest: string;
  paymentDueDate: string;
  directPaymentUrl: string;
  coverFeesCheckbox: boolean;
  showPaymentSummary: boolean;
  deposit: {
    enabled: boolean;
    amount: number;
  };
  donation: {
    enabled: boolean;
    max: number;
  };
  checks: {
    allowed: boolean;
    showPostalAddress: boolean;
    payee: string;
    address: string;
  };
  statementDescriptorSuffix: string;
}

export interface SpreadsheetConfig {
  sheetId: string;
  columns: { name: string; visible: boolean }[];
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

export interface ReceiptsConfig {
  emailFrom: string;
  emailReplyTo: string;
}

export interface ThemeConfig {
  backgroundLight: string;
  backgroundDark: string;
  foregroundLight: string;
  foregroundDark: string;
  accentLight: string;
  accentDark: string;
}

export type Tenant = Omit<Tables<'tenants'>, 'event_config' | 'fields_config' | 'admissions_config' | 'payments_config' | 'theme_config' | 'spreadsheet_config' | 'waiver_config' | 'receipts_config'> & {
  event_config: EventConfig
  fields_config: FieldsConfig
  admissions_config: AdmissionsConfig
  payments_config: PaymentsConfig
  spreadsheet_config: SpreadsheetConfig | null
  theme_config: ThemeConfig
  waiver_config: WaiverConfig
  receipts_config: ReceiptsConfig
}

export type TenantSecrets = Tables<'tenant_secrets'>
