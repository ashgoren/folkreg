// The config a new tenant starts with, in the shape it's stored in the tenants table's jsonb
// columns. createTenant() in @repo/db writes defaultTenantConfig() into every new tenant row, so
// from the first page load the admin app shows (and the registration app reads) what's actually
// saved in the database, rather than a value supplied by code when a column is missing.
//
// Values with no sensible default (an event's title, a processor's keys) start as "", the same
// blank the admin forms use; the organizer reviews and fills in every page before the tenant goes
// live. Prices are
// placeholders taken from a real event's config, there to be replaced.
//
// spreadsheet_config isn't here: it stays null until a sheet is set up, since the sync can't
// run without a sheet id, and the Spreadsheet page derives its columns from the active fields.

import { FIELD_DEFS, type FieldName } from "@repo/fields";
import type {
  AdmissionsConfig, EventConfig, FieldConfig, FieldEntry, FieldsConfig, PaymentsConfig, ReceiptsConfig, ThemeConfig, WaiverConfig,
} from "./schemas";

// A function rather than a constant because the year is the current one at the time of the call.
export const defaultEventConfig = (): EventConfig => ({
  title: "",
  year: new Date().getFullYear(),
  location: "",
  date: "",
  timezone: "America/Los_Angeles",
  calendar: { title: "", description: "", location: "", start: "", end: "" },
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
  costRange: [120, 500],
  costDefault: 350,
  cost: 200,
  earlybirdCutoff: "",
  // A typical event's tiers, in the order registrants see them. They price by the age field's
  // options, and these are the values that field starts with. Ages 0-12 have one price each, so
  // their categories are unnamed: the registration form shows just the price.
  categories: [
    { label: "Benefactor", ageGroups: ["adult"], early: 340, later: 355 },
    { label: "Sustaining", ageGroups: ["adult"], early: 280, later: 295 },
    { label: "Sustaining", ageGroups: ["13-17"], early: 220, later: 235 },
    { label: "Basic", ageGroups: ["adult"], early: 220, later: 235 },
    { label: "Basic", ageGroups: ["13-17"], early: 160, later: 175 },
    { label: "", ageGroups: ["6-12"], early: 160, later: 175 },
    { label: "", ageGroups: ["3-5"], early: 105, later: 120 },
    { label: "", ageGroups: ["0-2"], early: 0, later: 0 },
  ],
  admissionQuantityMax: 4,
  waitlistCutoff: 999, // high enough that a new event doesn't waitlist anyone
  forceWaitlist: false,
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
  coverFeesCheckbox: false,
  showPaymentSummary: true,
  // Off to start, with amounts ready for when they're switched on.
  deposit: { enabled: false, amount: 50 },
  donation: { enabled: false, max: 999 },
  checks: { allowed: false, showPostalAddress: false, payee: "", address: "" },
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
export const defaultTenantConfig = () => ({
  event_config: defaultEventConfig(),
  fields_config: defaultFieldsConfig(),
  admissions_config: defaultAdmissionsConfig(),
  payments_config: defaultPaymentsConfig(),
  theme_config: defaultThemeConfig(),
  waiver_config: defaultWaiverConfig(),
  receipts_config: defaultReceiptsConfig(),
});
