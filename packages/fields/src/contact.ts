import { z } from "zod";
import { STATE_OPTIONS } from "./stateOptions";
import type { FieldDef } from "./types";

const NAME_FORMAT = z.string().regex(/^[^<>&@]+$/, "Invalid characters :(");
const EMAIL_FORMAT = z.email("Please enter a valid email address.");
const PHONE_FORMAT = z.string().regex(/^[2-9][0-9-() ]*$/, "Please enter a valid phone number.");

export const CONTACT_FIELD_DEFS = {
  first: {
    type: "text",
    autoComplete: "given-name",
    format: NAME_FORMAT,
    requiredMessage: "Please enter first name.",
    canDeactivate: false,
    defaults: {
      required: true,
      label: "First name",
      width: 6
    },
  },
  last: {
    type: "text",
    canIncludeOnNametag: true,
    autoComplete: "family-name",
    format: NAME_FORMAT,
    requiredMessage: "Please enter last name.",
    canDeactivate: false,
    defaults: {
      required: true,
      label: "Last name",
      width: 6,
      includeOnNametag: true
    },
  },
  nametag: {
    type: "text",
    format: NAME_FORMAT,
    requiredMessage: "Please enter a name.",
    defaults: {
      required: true,
      label: "Name for roster",
      width: 12
    },
  },
  pronouns: {
    type: "text",
    canIncludeOnNametag: true,
    format: NAME_FORMAT,
    defaults: { label: "Pronouns", width: 12, includeOnNametag: true },
  },
  email: {
    type: "email",
    autoComplete: "email",
    format: EMAIL_FORMAT,
    requiredMessage: "Please enter email address.",
    canDeactivate: false,
    defaults: {
      required: true,
      label: "Email",
      width: 6
    },
  },
  emailConfirmation: {
    type: "email",
    autoComplete: "email",
    format: EMAIL_FORMAT,
    requiredMessage: "Please re-enter your email address.",
    canDeactivate: false,
    crossValidation: (person) => {
      return person.email === person.emailConfirmation
        ? null
        : "Email addresses must match.";
    },
    defaults: {
      required: true,
      label: "Confirm email",
      width: 6
    },
    excludeFromSpreadsheet: true,
  },
  phone: {
    type: "phone",
    htmlType: "tel",
    autoComplete: "tel-national",
    format: PHONE_FORMAT,
    requiredMessage: "Please enter phone number.",
    canDeactivate: false,
    defaults: {
      required: true,
      label: "Phone",
      placeholder: "e.g. 555-555-5555",
      width: 12
    },
  },
  address: {
    type: "address",
    htmlType: "text",
    autoComplete: "street-address",
    requiredMessage: "Please enter street address.",
    defaults: {
      required: true,
      label: "Street address",
      width: 9
    },
  },
  apartment: {
    type: "text",
    autoComplete: "address-line2",
    defaults: {
      label: "Apt, Suite, etc.",
      width: 3
    },
  },
  city: {
    type: "text",
    autoComplete: "address-level2",
    requiredMessage: "Please enter city.",
    defaults: {
      required: true,
      label: "City",
      width: 5
    },
  },
  state: {
    type: "autocomplete",
    autoComplete: "address-level1",
    suggestions: STATE_OPTIONS,
    requiredMessage: "Please enter state or province.",
    defaults: {
      required: true,
      label: "State / Province",
      width: 4
    },
  },
  zip: {
    type: "text",
    autoComplete: "postal-code",
    requiredMessage: "Please enter zip/postal code.",
    defaults: {
      required: true,
      label: "Zip code",
      width: 3
    },
  },
} satisfies Record<string, Omit<FieldDef, "group">>;
