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
  validation: z.ZodTypeAny;
  crossValidation?: (person: Record<string, unknown>, personIndex: number) => string | null;
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
