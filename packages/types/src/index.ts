import { Tables, Enums } from "./database.types.js"

export * from "./database.types.js"

export type PaymentProcessor = Enums<'payment_processor_type'>
export type PaymentMethod = Enums<'payment_method_type'>
export type OrderStatus = Enums<'order_status_type'>
export type Environment = Enums<'environment_type'>

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
  country?: string;
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
  titleWithYear: string;
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
    policies?: {
      health?: string;
      safety?: string;
    }
  };
  nametags: {
    includePronouns: boolean;
    includeLastName: boolean;
  };
}

export interface FieldConfig {
  field: string;
  title?: string;
  label?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  rows?: number;
  required?: boolean;
  requiredMessage?: string;
}

export interface RegistrationConfig {
  waitlistCutoff: number | null;
  showPreregistration: boolean;
  showWaiver: boolean;
  docusealTemplateId: string | null;
  admissionQuantityMax: number | null;
  fields: {
    contact: FieldConfig[];
    misc: FieldConfig[];
  };
}

export type AdmissionsConfig =
  | { mode: 'sliding-scale'; costRange: [number, number]; costDefault: number }
  | { mode: 'fixed'; cost: number }
  | { mode: 'tiered'; earlybirdCutoff: string }

export interface PaymentsConfig {
  stripePublishableKey: string | null;
  paypalClientId: string | null;
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
    address?: string[];
  };
  statementDescriptorSuffix: string | null;
}

export interface SpreadsheetConfig {
  sheetId: string;
  fieldOrder: string[];
}

export type ThemeConfig = Record<string, string>; // TBD

export type Tenant = Omit<Tables<'tenants'>, 'event_config' | 'registration_config' | 'admissions_config' | 'payments_config' | 'theme_config' | 'spreadsheet_config'> & {
  event_config: EventConfig | null
  registration_config: RegistrationConfig | null
  admissions_config: AdmissionsConfig | null
  payments_config: PaymentsConfig | null
  spreadsheet_config: SpreadsheetConfig | null
  theme_config: ThemeConfig | null
}

export type TenantSecrets = Tables<'tenant_secrets'>
