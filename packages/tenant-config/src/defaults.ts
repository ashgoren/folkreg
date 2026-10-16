// The config a new tenant starts with, in the shape it's stored in the tenants table's jsonb
// columns. createTenant() in @repo/db writes defaultTenantConfig() into every new tenant row, so
// from the first page load the admin app shows (and the registration app reads) what's actually
// saved in the database, rather than a value supplied by code when a column is missing.
//
// Values with no sensible default start as "", the same blank the admin forms use.
//
// This is just the starting point for a new tenant.
// Organizers review and fill in every page before opening registration.

import { FIELD_DEFS, type FieldName } from "@repo/fields";
import type {
  ActiveField, AdmissionsConfig, EventConfig, FieldsConfig, PaymentsConfig, ReceiptsConfig, RegistrationConfig, SpreadsheetConfig, ThemeConfig, WaiverConfig,
} from "./schemas";

export const defaultEventConfig = (): EventConfig => ({
  title: "",
  location: "",
  start: "",
  end: "",
  timezone: "America/Los_Angeles",
  date: "",
  calendar: { show: false, description: "", location: "" },
  contacts: { info: "", housing: "" },
  links: { info: "", health: "", safety: "" },
});

// A field's starting settings when it's activated: the label, placeholder, width, etc. from its
// catalog entry in @repo/fields, whose `defaults` use the same keys. Cloned so the tenant's copy
// (options arrays included) never shares objects with the catalog.
export const defaultActiveFieldSettings = (fieldName: FieldName): Omit<ActiveField, "name"> =>
  structuredClone(FIELD_DEFS[fieldName].defaults);

// A field as it starts out, whether in a new tenant's default set or when an organizer turns it on
// on the Fields page: just its catalog defaults, name attached.
export const defaultActiveField = (name: FieldName): ActiveField => ({
  name,
  ...defaultActiveFieldSettings(name),
});

const DEFAULT_CONTACT_FIELDS: FieldName[] = [
  "first", "last", "nametag", "pronouns", "email", "emailConfirmation", "phone", "address", "apartment", "city", "state", "zip",
];
const DEFAULT_MISC_FIELDS: FieldName[] = [
  "share", "allergies", "carpool", "bedding", "volunteer", "housing", "roommate", "misc", "agreement", "comments",
];

export const defaultFieldsConfig = (): FieldsConfig => ({
  contact: DEFAULT_CONTACT_FIELDS.map(defaultActiveField),
  misc: DEFAULT_MISC_FIELDS.map(defaultActiveField),
});

export const defaultRegistrationConfig = (): RegistrationConfig => ({
  opening: "closed",
  opensAt: "",
  closeAt: { enabled: false, at: "" },
  closeAfter: { enabled: false, people: 100 },
  mode: "pay",
  waitlistAfter: { enabled: false, people: 100 },
  lotteryResultsDate: "",
  showPreregistration: false,
});

export const defaultAdmissionsConfig = (): AdmissionsConfig => ({
  mode: "sliding-scale",
  slidingScale: { min: 120, max: 500, default: 350 },
  fixed: { price: 200 },
  tiered: {
    earlybirdCutoff: "",
    lateIncrease: 15,
    prices: [
      {
        ageGroup: "adult",
        options: [{ label: "Benefactor", price: 340 }, { label: "Sustaining", price: 280 }, { label: "Basic", price: 220 }],
      },
      { ageGroup: "13-17", options: [{ label: "Sustaining", price: 220 }, { label: "Basic", price: 160 }] },
      { ageGroup: "6-12", options: [{ label: "", price: 160 }] },
      { ageGroup: "3-5", options: [{ label: "", price: 105 }] },
      { ageGroup: "0-2", options: [{ label: "", price: 0 }] },
    ],
  },
  admissionQuantityMax: 4,
});

export const defaultPaymentsConfig = (): PaymentsConfig => ({
  processor: "stripe",
  stripePublishableKeyLive: "",
  stripePublishableKeyTest: "",
  paypalClientIdLive: "",
  paypalClientIdTest: "",
  paymentDueDate: "",
  directPaymentUrl: "",
  paymentLinkDays: 7, // a week to pay once a lottery or waitlist spot is offered
  coverFees: { enabled: false, percent: 2.9, fixed: 0.3 },
  showPaymentSummary: true,
  deposit: { enabled: false, amount: 50 },
  donation: { enabled: false, max: 999 },
  checks: { allowed: false, sendTo: "email", payee: "", address: "" },
  statementDescriptorSuffix: "",
});

export const defaultThemeConfig = (): ThemeConfig => ({
  backgroundLight: "#ffffff",
  foregroundLight: "#0a0a0a",
  accentLight: "#2563eb",
  backgroundDark: "#0a0a0a",
  foregroundDark: "#fafafa",
  accentDark: "#3b82f6",
  headerLight: "",
  headerDark: "",
});

export const defaultWaiverConfig = (): WaiverConfig => ({ show: false, docusealTemplateId: "" });

export const defaultReceiptsConfig = (): ReceiptsConfig => ({ emailFrom: "", emailReplyTo: "" });

export const defaultSpreadsheetConfig = (): SpreadsheetConfig => ({ sheetId: "", columns: [] });

// Every config column a new tenant row gets.
export const defaultTenantConfig = () => ({
  event_config: defaultEventConfig(),
  fields_config: defaultFieldsConfig(),
  registration_config: defaultRegistrationConfig(),
  admissions_config: defaultAdmissionsConfig(),
  payments_config: defaultPaymentsConfig(),
  theme_config: defaultThemeConfig(),
  waiver_config: defaultWaiverConfig(),
  receipts_config: defaultReceiptsConfig(),
  spreadsheet_config: defaultSpreadsheetConfig(),
});
