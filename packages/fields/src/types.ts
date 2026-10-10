import type { z } from "zod";

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

export interface FieldDefaults {
  title?: string;
  label?: string;
  placeholder?: string;
  rows?: number;
  width?: number;
  options?: { label: string; value: string }[];
  defaultValue?: string;
  /** Where the field's Required switch starts when a tenant activates it. */
  required?: boolean;
}

export interface FieldDef {
  type: FieldType;
  group: "contact" | "misc";
  autoComplete?: string;
  suggestions?: readonly { id: string; fullName: string; abbreviation: string; country: string }[];
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
   * The options the first person may choose, e.g. the person registering can't be a young child.
   * The registration form disables the rest for them; personSchema rejects anything else, with
   * `message`. Other people may choose any option.
   */
  firstPersonOptions?: { values: string[]; message: string };
  /** A rule involving other fields of the same person; returns an error message, or null. */
  crossValidation?: (person: Record<string, unknown>) => string | null;
  followUp?: FollowUp;
  defaults?: FieldDefaults;
  /** Excluded from the Spreadsheet page's available columns (e.g. emailConfirmation, structurally redundant with email) */
  excludeFromSpreadsheet?: boolean;
  /**
   * The field can be printed on a registrant's nametag, alongside their name. The admin offers an
   * "Include on nametag?" switch for it; whether a tenant does is its includeOnNametag setting.
   */
  canIncludeOnNametag?: boolean;
}
