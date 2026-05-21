import { z } from "zod";
import { STATE_OPTIONS } from "./stateOptions";
import type { FieldDef } from "./types";

export const CONTACT_FIELD_DEFS: Record<string, Omit<FieldDef, "group">> = {
  first: {
    type: "text",
    autoComplete: "given-name",
    validation: z.string().min(1, "Please enter first name."),
    defaults: {
      label: "First name",
      width: 6
    },
  },
  last: {
    type: "text",
    autoComplete: "family-name",
    validation: z.string().min(1, "Please enter last name."),
    defaults: {
      label: "Last name",
      width: 6
    },
  },
  nametag: {
    type: "text",
    validation: z.string().min(1, "Please enter name for roster."),
    defaults: {
      label: "Name for roster",
      width: 12
    },
  },
  pronouns: {
    type: "text",
    validation: z.string(),
    defaults: { label: "Pronouns", width: 12 },
  },
  email: {
    type: "email",
    autoComplete: "email",
    validation: z.email("Please enter a valid email address."),
    defaults: {
      label: "Email",
      width: 6
    },
  },
  emailConfirmation: {
    type: "email",
    autoComplete: "email",
    validation: z.email("Please enter a valid email address."),
    crossValidation: (person) => {
      return person.email === person.emailConfirmation
        ? null
        : "Email addresses must match.";
    },
    defaults: {
      label: "Confirm email",
      width: 6
    },
  },
  phone: {
    type: "phone",
    autoComplete: "tel-national",
    validation: z.string().min(1, "Please enter phone number."),
    defaults: {
      label: "Phone",
      placeholder: "e.g. 555-555-5555",
      width: 12
    },
  },
  address: {
    type: "address",
    autoComplete: "street-address",
    validation: z.string().min(1, "Please enter street address."),
    defaults: {
      label: "Street address",
      width: 9
    },
  },
  apartment: {
    type: "text",
    autoComplete: "address-line2",
    validation: z.string(),
    defaults: {
      label: "Apt, Suite, etc.",
      width: 3
    },
  },
  city: {
    type: "text",
    autoComplete: "address-level2",
    validation: z.string().min(1, "Please enter city."),
    defaults: {
      label: "City",
      width: 5
    },
  },
  state: {
    type: "autocomplete",
    autoComplete: "address-level1",
    suggestions: STATE_OPTIONS,
    validation: z.string().min(1, "Please enter state or province."),
    defaults: {
      label: "State / Province",
      width: 4
    },
  },
  zip: {
    type: "text",
    autoComplete: "postal-code",
    validation: z.string().min(1, "Please enter zip/postal code."),
    defaults: {
      label: "Zip code",
      width: 3
    },
  },
};
