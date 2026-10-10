// The shape of each tenants jsonb config column, written once as a zod schema. The TypeScript
// types are inferred from these (z.infer), so a type and its validation can't drift apart. The same
// schemas validate an admin form's values before they're saved and parse each column when a tenant
// is read (parseTenantConfig), so a malformed row fails at the read with a clear error instead of
// surfacing later as a missing or wrongly typed value.
//
// Every key is always present and unset text is "", the same values the admin forms edit, so a
// form is seeded straight from its stored config and saves what it validated. Rules are format-only
// (email format, hex colors, number ranges): a blank field passes, since organizers fill pages in
// over several sessions. Numbers are always required -- a cleared number input is NaN, which fails
// with "Required" rather than being saved. Field settings (fieldConfigSchema) are the exception:
// not every setting applies to every field, so their keys are optional.

import { z } from "zod";
import { FIELD_DEFS, FIELD_NAMES } from "@repo/fields";

const requiredNumber = (min: number) => z.number({ error: "Required" }).min(min);
const optionalEmail = z.union([z.literal(""), z.string().email("Must be a valid email")]);
// A web link registrants follow: http(s) on a real domain, so a missing "https://" (which would
// make the link relative to the registration site) or a mailto:/javascript: link is caught.
// One check, so a value wrong in several ways (e.g. mailto:, with no domain) gets one message.
const webUrl = z.url({ protocol: /^https?$/, hostname: z.regexes.domain });
const optionalUrl = z.string().refine((value) => value === "" || webUrl.safeParse(value).success, {
  error: "Must be a web address starting with https://",
});
const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Must be a hex color, e.g. #d97706");

// The timezones an event can be in by IANA name, which is what timezone arithmetic needs.
export const TIMEZONES = [
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
] as const;
export type Timezone = (typeof TIMEZONES)[number]["value"];
const timezoneSchema = z.enum(TIMEZONES.map((timezone) => timezone.value) as [Timezone, ...Timezone[]], { error: "Choose a timezone" });

export const eventConfigSchema = z.object({
  title: z.string(),
  year: z.number().int().min(2000).max(2100),
  location: z.string(),
  date: z.string(),
  timezone: timezoneSchema,
  calendar: z.object({
    title: z.string(),
    description: z.string(),
    location: z.string(),
    start: z.string(),
    end: z.string(),
  }),
  contacts: z.object({
    info: optionalEmail,
    housing: optionalEmail,
  }),
  links: z.object({
    info: optionalUrl,
    health: optionalUrl,
    safety: optionalUrl,
  }),
});
export type EventConfig = z.infer<typeof eventConfigSchema>;

// A whole number from min (to max, if given), with one message for every way a value can fail it
// -- not a number, a fraction, out of range -- so fixing one problem never just reveals another.
const wholeNumber = ({ min, max }: { min: number; max?: number }, error: string) => {
  const number = z.number({ error }).int({ error }).min(min, { error });
  return max === undefined ? number : number.max(max, { error });
};

// A tenant's settings for one active field: copied from the field's catalog defaults in
// @repo/fields when the organizer activates it (defaultFieldEntry), then the tenant's own -- the
// registration form reads these, never the catalog's defaults. Keys are optional because not every
// setting applies to every field (rows only to a textarea, options only to radio and checkbox
// fields, width only to contact fields).
export const fieldConfigSchema = z.object({
  title: z.string().optional(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  // The field's starting value on the registration form: the checked options of a checkbox field,
  // any other field's value ("" for none). Which of the two a field takes is checked against the
  // catalog in fieldsConfigSchema.
  defaultValue: z.union([z.string(), z.array(z.string())]).optional(),
  // Rows of a textarea; width in columns of the registration form's 12-column grid.
  // Rows and width are null once an organizer clears them (an undefined value would show in the
  // form as the one it loaded with), and absent if never set. Either way the registration form
  // uses its own layout default.
  rows: wholeNumber({ min: 1 }, "Must be a whole number, 1 or more").nullable().optional(),
  width: wholeNumber({ min: 1, max: 12 }, "Must be a whole number from 1 to 12").nullable().optional(),
  required: z.boolean().optional(),
  includeOnNametag: z.boolean().optional(),
  // Which options the person registering may choose, for a field that can limit them (age).
  firstPersonOptions: z.array(z.string()).optional(),
});
export type FieldConfig = z.infer<typeof fieldConfigSchema>;

// An active field: which catalog field it is, plus the tenant's settings for it.
export const fieldEntrySchema = fieldConfigSchema.extend({ name: z.enum(FIELD_NAMES) });
export type FieldEntry = z.infer<typeof fieldEntrySchema>;

// A tenant's active fields, by section of the registration form, each section in the order it
// shows them. A field is active exactly when it has an entry; removing it removes its settings.
// Names are checked against the catalog, so a renamed or removed catalog field fails the read
// loudly rather than being skipped.
export const fieldsConfigSchema = z.object({
  contact: z.array(fieldEntrySchema),
  misc: z.array(fieldEntrySchema),
}).superRefine((config, ctx) => {
  const seen = new Set<string>();
  for (const group of ["contact", "misc"] as const) {
    config[group].forEach((entry, index) => {
      const { name } = entry;
      const issue = (key: keyof FieldEntry, message: string) => ctx.addIssue({ code: "custom", path: [group, index, key], message });
      if (FIELD_DEFS[name].group !== group) issue("name", `${name} belongs in ${FIELD_DEFS[name].group}`);
      if (seen.has(name)) issue("name", `${name} is listed more than once`);
      seen.add(name);
      checkChoices(entry, issue);
    });
  }
});

// A field's default, first-person options and options against the catalog's rules for its type. Shown on the Fields page
// under the field's Default and options.
const checkChoices = ({ name, defaultValue, firstPersonOptions, options = [] }: FieldEntry, issue: (key: keyof FieldEntry, message: string) => void) => {
  const def = FIELD_DEFS[name];
  const isCheckbox = def.type === "checkbox";

  // The Fields page only offers the right kind, so a mismatch is stored data that's wrong.
  if (defaultValue !== undefined && Array.isArray(defaultValue) !== isCheckbox) {
    issue("defaultValue", isCheckbox ? "Must be a list of options" : "Must be a single value");
    return;
  }

  // An option's value can change after it's chosen, leaving a setting pointing at nothing. "" is a
  // radio field's "none".
  const values = new Set(options.map((option) => option.value));
  const checkChosen = (key: "defaultValue" | "firstPersonOptions", chosen: string | string[] | undefined) => {
    const stale = [chosen ?? []].flat().filter((value) => value !== "" && !values.has(value));
    if (stale.length > 0) {
      issue(key, `${stale.map((value) => `"${value}"`).join(", ")} ${stale.length === 1 ? "isn't one of the options" : "aren't options"}`);
    }
  };
  if (def.type === "radio" || isCheckbox) checkChosen("defaultValue", defaultValue);

  if (firstPersonOptions !== undefined) {
    // No option at all would leave nobody able to register.
    if (firstPersonOptions.length === 0) issue("firstPersonOptions", "Choose at least one");
    else checkChosen("firstPersonOptions", firstPersonOptions);
  }

  const prerequisite = def.prerequisiteOption;
  if (prerequisite !== undefined) {
    if (!options.some((option) => option.value === prerequisite)) {
      issue("options", `Needs an option with the value "${prerequisite}": the other options depend on it`);
    }
    if (Array.isArray(defaultValue) && defaultValue.length > 0 && !defaultValue.includes(prerequisite)) {
      issue("defaultValue", `Must include "${prerequisite}" when anything else is checked`);
    }
  }
};
export type FieldsConfig = z.infer<typeof fieldsConfigSchema>;

// One price a registrant of some age group can choose, e.g. "Sustaining", $280. The label tells
// apart several prices for the same age group; a lone price can go without one.
export const tieredPriceSchema = z.object({
  label: z.string(),
  price: requiredNumber(0),
});
export type TieredPrice = z.infer<typeof tieredPriceSchema>;

// An age group's prices, in the order registrants see them. `ageGroup` is the value of one of the
// tenant's age field options (its price brackets), which the Fields page edits. Not checked against
// them here: each column is validated on its own, and the Admissions page lists prices for a value
// that's no longer an age option, so they can be removed.
export const ageGroupPricesSchema = z.object({
  ageGroup: z.string(),
  options: z.array(tieredPriceSchema),
});
export type AgeGroupPrices = z.infer<typeof ageGroupPricesSchema>;

// Sliding scale: registrants choose what to pay between min and max, starting at the default
// amount.
export const slidingScaleSchema = z.object({
  min: requiredNumber(0),
  max: requiredNumber(0),
  default: requiredNumber(0),
}).refine((scale) => scale.default >= scale.min && scale.default <= scale.max, {
  message: "Must be between minimum and maximum",
  path: ["default"],
});

// Tiered: each age group's prices, every one going up by lateIncrease after the early-bird cutoff
// (see priceAfterCutoff).
export const tieredSchema = z.object({
  // The last day early-bird prices apply (YYYY-MM-DD), read as a whole day in event_config.timezone.
  // "" means no early-bird period: prices stay as entered and lateIncrease never applies.
  earlybirdCutoff: z.union([z.literal(""), z.iso.date({ error: "Must be a date" })], { error: "Must be a date" }),
  lateIncrease: requiredNumber(0),
  // The Admissions page only ever adds an age group's entry once, so a repeat is stored data that's wrong.
  prices: z.array(ageGroupPricesSchema).refine((prices) => new Set(prices.map((entry) => entry.ageGroup)).size === prices.length, {
    message: "An age group is listed more than once",
  }),
});

// Every pricing mode's values, each under its own key; `mode` picks which one applies, so switching
// modes (even by accident) never discards another mode's prices. All of them are validated whichever
// mode is active -- the Admissions page only lets an organizer switch modes while the current one is
// valid, and a hidden mode's fields can't be edited, so they stay valid.
export const admissionsConfigSchema = z.object({
  mode: z.enum(["sliding-scale", "fixed", "tiered"]),
  slidingScale: slidingScaleSchema,
  fixed: z.object({ price: requiredNumber(0) }),
  tiered: tieredSchema,
  // The most tickets one checkout can buy.
  admissionQuantityMax: requiredNumber(1).int(),
  // When new registrants join the waitlist instead of paying: never, once `capacity` people have
  // registered, or now. Capacity is kept whichever is chosen, so switching back restores it.
  waitlist: z.object({
    when: z.enum(["never", "when-full", "now"]),
    capacity: wholeNumber({ min: 1 }, "Must be a whole number, 1 or more"),
  }),
});

/** A tiered price after the early-bird cutoff: higher by lateIncrease, except that free stays free. */
export const priceAfterCutoff = (price: number, lateIncrease: number) => (price > 0 ? price + lateIncrease : 0);
export type AdmissionsConfig = z.infer<typeof admissionsConfigSchema>;

export const paymentProcessorSchema = z.enum(["stripe", "paypal"]);
export type PaymentProcessor = z.infer<typeof paymentProcessorSchema>;

// Both processors' public keys are kept whichever is active, so switching `processor` never
// discards what an organizer entered for the other one. Their secrets live in tenant_secrets.
export const paymentsConfigSchema = z.object({
  processor: paymentProcessorSchema,
  stripePublishableKeyLive: z.string(),
  stripePublishableKeyTest: z.string(),
  statementDescriptorSuffix: z.string(),
  paypalClientIdLive: z.string(),
  paypalClientIdTest: z.string(),
  paymentDueDate: z.string(),
  directPaymentUrl: z.string(),
  coverFeesCheckbox: z.boolean(),
  showPaymentSummary: z.boolean(),
  deposit: z.object({
    enabled: z.boolean(),
    amount: requiredNumber(0),
  }),
  donation: z.object({
    enabled: z.boolean(),
    max: requiredNumber(0),
  }),
  checks: z.object({
    allowed: z.boolean(),
    showPostalAddress: z.boolean(),
    payee: z.string(),
    // Stored exactly as entered (a multi-line string); splitting it into display lines is the
    // reader's job.
    address: z.string(),
  }),
});
export type PaymentsConfig = z.infer<typeof paymentsConfigSchema>;

export const themeConfigSchema = z.object({
  backgroundLight: hexColor,
  backgroundDark: hexColor,
  foregroundLight: hexColor,
  foregroundDark: hexColor,
  accentLight: hexColor,
  accentDark: hexColor,
});
export type ThemeConfig = z.infer<typeof themeConfigSchema>;

// The DocuSeal API key is a tenant_secrets column, not part of this config.
export const waiverConfigSchema = z.object({
  show: z.boolean(),
  docusealTemplateId: z.string(),
});
export type WaiverConfig = z.infer<typeof waiverConfigSchema>;

export const receiptsConfigSchema = z.object({
  emailFrom: optionalEmail,
  emailReplyTo: optionalEmail,
});
export type ReceiptsConfig = z.infer<typeof receiptsConfigSchema>;

export const spreadsheetConfigSchema = z.object({
  // Accepts either a bare sheet ID or a full Google Sheets URL, stored as-is -- whatever reads
  // this to call the Sheets API is responsible for extracting the ID, e.g. via
  // `trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? trimmed`.
  sheetId: z.string(),
  columns: z.array(z.object({
    name: z.string(),
    visible: z.boolean(),
  })),
});
export type SpreadsheetConfig = z.infer<typeof spreadsheetConfigSchema>;

// Every config column of a tenants row. spreadsheet_config is the one nullable column: null means
// no sheet has been set up yet.
export const tenantConfigSchema = z.object({
  event_config: eventConfigSchema,
  fields_config: fieldsConfigSchema,
  admissions_config: admissionsConfigSchema,
  payments_config: paymentsConfigSchema,
  theme_config: themeConfigSchema,
  waiver_config: waiverConfigSchema,
  receipts_config: receiptsConfigSchema,
  spreadsheet_config: spreadsheetConfigSchema.nullable(),
});
export type TenantConfig = z.infer<typeof tenantConfigSchema>;

// Parses the config columns of a tenants row read from the database. Throws, naming the tenant and
// every invalid field, if any column doesn't match its schema -- a row written by an older shape of
// the code, or edited by hand.
export const parseTenantConfig = (tenantId: string, row: unknown): TenantConfig => {
  const result = tenantConfigSchema.safeParse(row);
  if (!result.success) throw new Error(`Tenant ${tenantId} has invalid config:\n${z.prettifyError(result.error)}`);
  return result.data;
};
