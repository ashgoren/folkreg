import type { z } from "zod";
import type { FieldDefaults } from "./field-defaults-schema";

export type { FieldDefaults };

export type FieldType =
  | "text"
  | "email"
  | "phone"
  | "address"
  | "autocomplete"
  | "radio"
  | "checkbox"
  | "textarea";

export interface FollowUp {
  triggerValue: string;
  storageKey: string;
  label: string;
  description?: string;
  rows?: number;
  requiredMessage: string;
}

export interface FieldDef {
  type: FieldType;
  group: "contact" | "misc";
  /**
   * The native <input type="..."> this field renders as, for the catalog types that render a plain
   * Input (text, email, phone, address). Defaults to `type` when omitted.
   */
  htmlType?: string;
  autoComplete?: string;
  // A fixed, code-provided list offered for an "autocomplete" field (e.g. state) -- unlike options,
  // never tenant-editable, so there's no admin UI for it.
  suggestions?: readonly { label: string; value: string }[];
  /**
   * The format a filled-in value must have, e.g. an email address. A blank value isn't checked
   * against it: whether a blank is allowed is the tenant's required setting (see personSchema).
   */
  format?: z.ZodType<string>;
  /**
   * Shown when a required field is left blank. Without one, personSchema uses a message by type.
   * Shown right under the field, so it needn't name it -- and mustn't name it in words a tenant can
   * change with the field's label or heading, e.g. what the name is for (a roster or a nametag),
   * how much of a name is wanted, or what's being agreed to.
   */
  requiredMessage?: string;
  /**
   * Asked of the first person in an order only -- the one registering -- e.g. agreeing on behalf of
   * everyone they're registering. The registration form doesn't show it to anyone else, and
   * personSchema doesn't check it for them.
   */
  firstPersonOnly?: boolean;
  /**
   * The tenant can limit which of the field's options the first person may choose, e.g. the person
   * registering can't be a young child. The admin offers a picker for it; which options is the
   * tenant's firstPersonOptions setting (see FieldDefaults), since the options are the tenant's too.
   */
  canLimitFirstPerson?: boolean;
  /** A rule involving other fields of the same person; returns an error message, or null. */
  crossValidation?: (person: Record<string, unknown>) => string | null;
  followUp?: FollowUp;
  /**
   * For a checkbox field: the option every other option depends on, e.g. a roster can't list
   * someone's email without their name. Checking any other option checks it too, and unchecking it
   * unchecks the rest (toggleOption); a selection without it is invalid unless empty.
   */
  prerequisiteOption?: string;
  defaults: FieldDefaults;
  /** Excluded from the Spreadsheet page's available columns (e.g. emailConfirmation, structurally redundant with email) */
  excludeFromSpreadsheet?: boolean;
  /**
   * The field can be printed on a registrant's nametag, alongside their name. The admin offers an
   * "Include on nametag?" switch for it; whether a tenant does is its includeOnNametag setting.
   */
  canIncludeOnNametag?: boolean;
  /**
   * false for a field the registration app relies on by name (e.g. email, which autosave checks to
   * start saving a draft) -- the Fields page offers no way to remove it, so a tenant can't be
   * configured into a state the registration app can't actually run in.
   */
  canDeactivate?: boolean;
}
