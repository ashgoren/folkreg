import { Tables, Enums, Database } from "./database.types"
import { type SupabaseClient } from "@supabase/supabase-js"

export * from "./database.types"

export type DbClient = SupabaseClient<Database>

export type PaymentProcessor = 'stripe' | 'paypal'
export type PaymentMethod = Enums<'payment_method_type'>
export type OrderStatus = Enums<'order_status_type'>

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

export type Order = Omit<Tables<'orders'>, 'people'> & {
  people: Person[];
}

export interface EventConfig {
  title: string;
  year: number;
  location: string;
  date: string;
  timezone: string;
  calendar?: {
    title: string;
    description: string;
    location: string;
    start: string;
    end: string;
  };
  contacts: {
    info: string;
    housing?: string;
  };
  links: {
    info?: string;
    health?: string;
    safety?: string;
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
  docusealTemplateId: string | null;
}

export interface TieredCategory {
  label: string;
  ageGroups: AgeGroup[];
  early: number;
  later: number;
}

export type AdmissionsConfig = (
  | { mode: 'sliding-scale'; costRange: [number, number]; costDefault: number }
  | { mode: 'fixed'; cost: number }
  | { mode: 'tiered'; earlybirdCutoff: string; categories: TieredCategory[] }
) & {
  admissionQuantityMax: number;
  waitlistCutoff: number;
}

export interface PaymentsConfig {
  processor: PaymentProcessor;
  stripePublishableKeyLive: string | null;
  stripePublishableKeyTest: string | null;
  paypalClientIdLive: string | null;
  paypalClientIdTest: string | null;
  paymentDueDate: string | null;
  directPaymentUrl: string | null;
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
    showPostalAddress?: boolean;
    payee?: string;
    address?: string;
  };
  statementDescriptorSuffix: string | null;
}

export interface SpreadsheetConfig {
  sheetId: string;
  columns: { name: string; visible: boolean }[];
}

// Computed order/payment columns the spreadsheet sync writes alongside registrant
// fields -- not user-entered, so not part of the FieldDef catalog in @repo/fields.
// `waiver`/`deposit`/`donation` are only relevant when the corresponding tenant
// feature is enabled; the rest always apply.
export const SPREADSHEET_SYSTEM_COLUMNS = [
  'admission', 'donation', 'total', 'deposit', 'fees', 'paid', 'charged',
  'status', 'purchaser', 'completedAt', 'paymentId', 'paymentEmail',
  'waiver', 'environment',
] as const;

export interface ReceiptsConfig {
  emailFrom: string | null;
  emailReplyTo: string | null;
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
  event_config: EventConfig | null
  fields_config: FieldsConfig | null
  admissions_config: AdmissionsConfig | null
  payments_config: PaymentsConfig | null
  spreadsheet_config: SpreadsheetConfig | null
  theme_config: ThemeConfig | null
  waiver_config: WaiverConfig | null
  receipts_config: ReceiptsConfig | null
}

export type TenantSecrets = Tables<'tenant_secrets'>
