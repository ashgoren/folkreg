// The config a new tenant starts with, in the shape it's stored in the tenants table's jsonb
// columns. createTenant() in @repo/db writes defaultTenantConfig() into every new tenant row, so
// from the first page load the admin app shows (and the registration app reads) what's actually
// saved in the database, rather than a value supplied by code when a column is missing.
//
// Values with no sensible default (an event's title, a processor's keys) start as "", the same
// blank the admin forms use; the organizer reviews and fills in every page before the tenant goes
// live. Prices are
// placeholders taken from a real event's config, there to be replaced.

import { FIELD_DEFS, type FieldName } from "@repo/fields";
import type {
  AdmissionsConfig, EventConfig, FieldConfig, FieldEntry, FieldsConfig, PaymentsConfig, ReceiptsConfig, SpreadsheetConfig, ThemeConfig, WaiverConfig,
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
// catalog entry in @repo/fields, whose `defaults` use the same keys as FieldConfig. Cloned so the
// tenant's copy (options arrays included) never shares objects with the catalog.
export const defaultFieldConfig = (fieldName: FieldName): FieldConfig => structuredClone(FIELD_DEFS[fieldName].defaults ?? {});

// A field as it starts out, whether in a new tenant's default set or when an organizer turns it on
// on the Fields page: its catalog defaults, printed on the nametag if it can be.
export const defaultFieldEntry = (name: FieldName): FieldEntry => ({
  name,
  ...defaultFieldConfig(name),
  ...(FIELD_DEFS[name].canIncludeOnNametag && { includeOnNametag: true }),
});

// The fields a typical event collects, in the order its form shows them. Removing a few is less
// work for an organizer than assembling the whole form from nothing.
const DEFAULT_CONTACT_FIELDS: FieldName[] = [
  "first", "last", "nametag", "pronouns", "email", "emailConfirmation", "phone", "address", "apartment", "city", "state", "zip",
];
const DEFAULT_MISC_FIELDS: FieldName[] = [
  "share", "allergies", "carpool", "bedding", "volunteer", "housing", "roommate", "misc", "agreement", "comments",
];

export const defaultFieldsConfig = (): FieldsConfig => ({
  contact: DEFAULT_CONTACT_FIELDS.map(defaultFieldEntry),
  misc: DEFAULT_MISC_FIELDS.map(defaultFieldEntry),
});

// Sliding scale is active for a new tenant; the other modes' values are what an organizer sees on
// first switching to them.
export const defaultAdmissionsConfig = (): AdmissionsConfig => ({
  mode: "sliding-scale",
  slidingScale: { min: 120, max: 500, default: 350 },
  fixed: { price: 200 },
  tiered: {
    earlybirdCutoff: "",
    // A typical event's prices, $15 more after the cutoff. They're keyed by the age field's options,
    // and these are the values that field starts with. Ages 0-12 have one price each, so it's
    // unlabeled: the registration form shows just the price.
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
  // No waitlist to start, with a capacity ready for when one is wanted.
  waitlist: { when: "never", capacity: 100 },
});

// processor has no "not chosen" value, so Stripe stands in until the organizer picks. Every key
// starts blank (and every secret null in tenant_secrets), so getPaymentProcessorCredentials()
// reports the tenant as unconfigured rather than treating this default as a working setup.
// Optional features start off, for the organizer to opt in to.
export const defaultPaymentsConfig = (): PaymentsConfig => ({
  processor: "stripe",
  stripePublishableKeyLive: "",
  stripePublishableKeyTest: "",
  paypalClientIdLive: "",
  paypalClientIdTest: "",
  paymentDueDate: "",
  directPaymentUrl: "",
  // Off to start, with Stripe's standard rate ready for when it's switched on.
  coverFees: { enabled: false, percent: 2.9, fixed: 0.3 },
  showPaymentSummary: true,
  // Off to start, with amounts ready for when they're switched on.
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
});

export const defaultWaiverConfig = (): WaiverConfig => ({ show: false, docusealTemplateId: "" });

// Filled in during SES setup for the tenant's sending domain.
export const defaultReceiptsConfig = (): ReceiptsConfig => ({ emailFrom: "", emailReplyTo: "" });

// Every config column a new tenant row gets.
// No sheet yet. No stored columns either: every available column shows, in field order, until
// the organizer reorders or hides one on the Spreadsheet page.
export const defaultSpreadsheetConfig = (): SpreadsheetConfig => ({ sheetId: "", columns: [] });

export const defaultTenantConfig = () => ({
  event_config: defaultEventConfig(),
  fields_config: defaultFieldsConfig(),
  admissions_config: defaultAdmissionsConfig(),
  payments_config: defaultPaymentsConfig(),
  theme_config: defaultThemeConfig(),
  waiver_config: defaultWaiverConfig(),
  receipts_config: defaultReceiptsConfig(),
  spreadsheet_config: defaultSpreadsheetConfig(),
});
