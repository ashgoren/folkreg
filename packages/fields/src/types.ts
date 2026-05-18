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
  value?: string;
}

export interface FieldDef {
  type: FieldType;
  autoComplete?: string;
  suggestions?: readonly { id: string; fullName: string; abbreviation: string; country: string }[];
  validation: z.ZodTypeAny;
  crossValidation?: (person: Record<string, unknown>, personIndex: number) => string | null;
  followUp?: FollowUp;
  defaults?: FieldDefaults;
}
