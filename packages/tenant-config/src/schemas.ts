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
// with "Required" rather than being saved. An active field's settings are the exception: not every
// setting applies to every field, so their keys are optional.

import { z } from "zod";
import { FIELD_DEFS, FIELD_NAMES, fieldDefaultsSchema } from "@repo/fields";

const requiredNumber = (min: number) => z.number({ error: "Required" }).min(min);

const wholeNumber = ({ min, max }: { min: number; max?: number }, error: string) => {
  const number = z.number({ error }).int({ error }).min(min, { error });
  return max === undefined ? number : number.max(max, { error });
};

const optionalEmail = z.union([z.literal(""), z.string().email("Must be a valid email")]);

const optionalDate = z.union([z.literal(""), z.iso.date({ error: "Must be a date" })], { error: "Must be a date" });

const webUrl = z.url({ protocol: /^https?$/, hostname: z.regexes.domain });

const optionalUrl = z.string().refine((value) => value === "" || webUrl.safeParse(value).success, {
  error: "Must be a web address starting with https://",
});

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Must be a hex color, e.g. #d97706");

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

// A floating date and time with no offset, e.g. "2026-04-03T19:00".
const localDateTime = z.iso.datetime({ local: true });
const optionalLocalDateTime = z.string().refine(
  (value) => value === "" || (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value) && localDateTime.safeParse(value).success),
  { error: "Must be a date and time" },
);
// The same moment written with seconds, so two values compare correctly.
const withSeconds = (value: string) => (value.length === "YYYY-MM-DDTHH:MM".length ? `${value}:00` : value);

// The event's facts, each stored once. What's shown elsewhere is derived from them: the year from
// `start`, the calendar entry's title, times, and (unless overridden) location from the event's own.
// `date` and `calendar.location` are overrides: blank means "use the derived value".
export const eventConfigSchema = z.object({
  title: z.string(),
  location: z.string(),
  start: optionalLocalDateTime,
  end: optionalLocalDateTime,
  timezone: timezoneSchema,
  date: z.string(), // plain text override to display date to registrants
  calendar: z.object({
    show: z.boolean(),
    description: z.string(),
    location: z.string(),
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
}).superRefine((event, ctx) => {
  if (event.start !== "" && event.end !== "" && withSeconds(event.end) <= withSeconds(event.start)) {
    ctx.addIssue({ code: "custom", path: ["end"], message: "Must be after the start" });
  }
  if (event.calendar.show) {
    for (const key of ["start", "end"] as const) {
      if (event[key] === "") ctx.addIssue({ code: "custom", path: [key], message: "Needed for the calendar links" });
    }
  }
});
export type EventConfig = z.infer<typeof eventConfigSchema>;

// A field that's active for a tenant: which catalog field it is, plus their settings for it.
// fieldDefaultsSchema (the settings alone) is @repo/fields' schema, not duplicated here -- it's the
// same shape a catalog field's own `defaults` uses.
export const activeFieldSchema = fieldDefaultsSchema.extend({ name: z.enum(FIELD_NAMES) });
export type ActiveField = z.infer<typeof activeFieldSchema>;

// A tenant's active fields, by section of the registration form, each section in the order it
// shows them. A field is active exactly when it has an entry; removing it removes its settings.
// Names are checked against the catalog, so a renamed or removed catalog field fails the read
// loudly rather than being skipped.
export const fieldsConfigSchema = z.object({
  contact: z.array(activeFieldSchema),
  misc: z.array(activeFieldSchema),
}).superRefine((config, ctx) => {
  const seen = new Set<string>();
  for (const group of ["contact", "misc"] as const) {
    config[group].forEach((field, index) => {
      const { name } = field;
      const issue = (key: keyof ActiveField, message: string) => ctx.addIssue({ code: "custom", path: [group, index, key], message });
      if (FIELD_DEFS[name].group !== group) issue("name", `${name} belongs in ${FIELD_DEFS[name].group}`);
      if (seen.has(name)) issue("name", `${name} is listed more than once`);
      seen.add(name);
      checkChoices(field, issue);
    });
  }
});

// A field's default, first-person options and options against the catalog's rules for its type. Shown on the Fields page
// under the field's Default and options.
const checkChoices = ({ name, defaultValue, firstPersonOptions, options = [] }: ActiveField, issue: (key: keyof ActiveField, message: string) => void) => {
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

  // A value is how an answer, a default, and an age group's prices name an option, so two options
  // sharing one are ambiguous. An option with no value yet is still being written.
  const filledValues = options.map((option) => option.value).filter((value) => value !== "");
  if (new Set(filledValues).size !== filledValues.length) issue("options", "Each option needs a different value");

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

// A limit on how many people register, switched on or off. `people` is kept and validated either
// way, so switching the limit back on restores it and a hidden number is never left invalid.
const peopleLimitSchema = z.object({
  enabled: z.boolean(),
  people: wholeNumber({ min: 1 }, "Must be a whole number, 1 or more"),
});

// A closing time, switched on or off. `at` is kept and validated either way, like a people limit.
const closingTimeSchema = z.object({
  enabled: z.boolean(),
  at: optionalLocalDateTime,
});

// Two separate questions about the registration form, neither of which affects payment: a payment
// link sent to an order (a lottery winner, a promoted waitlister, a deposit's balance) works
// whatever these say.
//
// When the form takes submissions: `opening` says when it opens (not at all, now, or at opensAt),
// and then it stays open until closeAt (if on) passes or closeAfter (if on) is reached. The closing
// conditions can only narrow the window, so they combine without any one overriding another.
//
// What a submission becomes: a registration paid for right away, an entry in a lottery drawn
// later, or a place on the waitlist. In "pay" mode, waitlistAfter (if on) puts new registrants on
// the waitlist once that many people are registered.
//
// Every option's and limit's values are kept whichever applies, so switching never discards them.
export const registrationConfigSchema = z.object({
  opening: z.enum(["closed", "now", "scheduled"]),
  // A local date-time on the event's clock (event_config.timezone). Applies only when opening is
  // "scheduled", and is required then.
  opensAt: optionalLocalDateTime,
  // Required while it's on.
  closeAt: closingTimeSchema,
  // Counts everyone registered: waitlisted people and lottery entries included.
  closeAfter: peopleLimitSchema,
  mode: z.enum(["pay", "lottery", "waitlist"]),
  // Counts registered people not on the waitlist. Applies only in "pay" mode.
  waitlistAfter: peopleLimitSchema,
  // When lottery entrants hear whether they were drawn (YYYY-MM-DD), shown in their receipt; blank
  // leaves it out. Applies only in "lottery" mode.
  lotteryResultsDate: optionalDate,
  // Whether registrants click through a page acknowledging the event's policies before the form.
  showPreregistration: z.boolean(),
}).superRefine((registration, ctx) => {
  // A time is required only while it applies: a scheduled opening or a closing time that's off can
  // be left blank. Unlike the admin's other format-only checks, these are presence checks, since a
  // scheduled opening (or closing time) with no time has no meaning to fall back on.
  const scheduled = registration.opening === "scheduled";
  const { opensAt, closeAt } = registration;
  if (scheduled && opensAt === "") {
    ctx.addIssue({ code: "custom", path: ["opensAt"], message: "Required" });
  }
  if (closeAt.enabled && closeAt.at === "") {
    ctx.addIssue({ code: "custom", path: ["closeAt", "at"], message: "Required" });
  }
  // Compared only when both apply, so a stored value that doesn't apply can't block a save.
  if (scheduled && closeAt.enabled && opensAt !== "" && closeAt.at !== "" && withSeconds(closeAt.at) <= withSeconds(opensAt)) {
    ctx.addIssue({ code: "custom", path: ["closeAt", "at"], message: "Must be after the opening time" });
  }
});
export type RegistrationConfig = z.infer<typeof registrationConfigSchema>;

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
  earlybirdCutoff: optionalDate,
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
  // When the balance is due after a deposit (YYYY-MM-DD), read as a whole day in
  // event_config.timezone (see endOfDay).
  paymentDueDate: optionalDate,
  // Where registrants who paid a deposit (or by check) send the rest electronically.
  directPaymentUrl: optionalUrl,
  // How many days a payment link sent to an order stays valid (a lottery winner's, or a promoted
  // waitlister's). Each link's expiry is fixed when it's sent, so a change applies only to links
  // sent afterward.
  paymentLinkDays: wholeNumber({ min: 1 }, "Must be a whole number, 1 or more"),
  // Whether registrants are offered to cover the processing fee, and the fee to add: `percent` of
  // the total (2.9 means 2.9%) plus `fixed` dollars. The tenant's own rates, since nonprofit and
  // negotiated rates vary; kept whether or not it's on.
  coverFees: z.object({
    enabled: z.boolean(),
    percent: requiredNumber(0).max(100, { error: "Must be 100 or less" }),
    fixed: requiredNumber(0),
  }),
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
    // Where registrants are pointed: the mailing address below, or the event's contact email to ask for instructions.
    sendTo: z.enum(["address", "email"]),
    payee: z.string(),
    // Stored exactly as entered (a multi-line string); splitting it into display lines is the reader's job.
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
  // "" until a sheet is set up, which is when the sync starts. Accepts either a bare sheet ID or
  // a full Google Sheets URL, stored as-is. Reader needs to extract ID.
  sheetId: z.string(),
  columns: z.array(z.object({
    name: z.string(),
    visible: z.boolean(),
  })),
});
export type SpreadsheetConfig = z.infer<typeof spreadsheetConfigSchema>;

// Every config column of a tenants row.
export const tenantConfigSchema = z.object({
  event_config: eventConfigSchema,
  fields_config: fieldsConfigSchema,
  registration_config: registrationConfigSchema,
  admissions_config: admissionsConfigSchema,
  payments_config: paymentsConfigSchema,
  theme_config: themeConfigSchema,
  waiver_config: waiverConfigSchema,
  receipts_config: receiptsConfigSchema,
  spreadsheet_config: spreadsheetConfigSchema,
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
