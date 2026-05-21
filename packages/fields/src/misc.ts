import { z } from "zod";
import type { FieldDef } from "./types";

export const MISC_FIELD_DEFS: Record<string, Omit<FieldDef, "group">> = {
  age: {
    type: "radio",
    validation: z.string().min(1, "Please select age range."),
    defaults: {
      title: "Age",
      label: "Please choose one.",
      options: [
        { label: "Adult", value: "adult" },
        { label: "13-17 yr old", value: "13-17" },
        { label: "6-12 yr old", value: "6-12" },
        { label: "3-5 yr old", value: "3-5" },
        { label: "0-2 yr old", value: "0-2" },
      ],
      value: "adult",
    },
  },
  share: {
    type: "checkbox",
    validation: z.array(z.string()),
    defaults: {
      title: "Roster",
      label: "What information do you want shared in the roster?",
      options: [
        { label: "Include my name in the roster", value: "name" },
        { label: "Include my pronouns in the roster", value: "pronouns" },
        { label: "Include my email in the roster", value: "email" },
        { label: "Include my phone number in the roster", value: "phone" },
        { label: "Include my address in the roster", value: "address" },
      ],
      value: "name, pronouns, email, phone, address",
    },
  },
  carpool: {
    type: "checkbox",
    validation: z.array(z.string()),
    defaults: {
      title: "Transportation and Hosting",
      label: "If you check any of these boxes we will be in touch closer to camp to coordinate.",
    },
  },
  volunteer: {
    type: "checkbox",
    validation: z.array(z.string()),
    defaults: {
      title: "Volunteering",
      label: "Everyone will be asked to help with camp, but we need a few people who can commit in advance or in larger ways.",
    },
  },
  dietaryPreferences: {
    type: "radio",
    validation: z.string().min(1, "Please select dietary preference."),
    defaults: {
      title: "Dietary Preferences",
      label: "Please choose one.",
    },
  },
  dietaryRestrictions: {
    type: "checkbox",
    validation: z.array(z.string()),
    followUp: {
      triggerValue: "other",
      storageKey: "dietaryRestrictionsOther",
      label: "Please describe your other dietary restrictions.",
      rows: 2,
      requiredMessage: "Please provide details about your dietary restrictions.",
    },
    defaults: {
      title: "Additional Dietary Restrictions",
      label: "Please note, we will try our best to accommodate you with the prepared meals.",
    },
  },
  allergies: {
    type: "textarea",
    validation: z.string(),
    defaults: {
      title: "Allergy / Safety Information",
      label: "Please elaborate on any allergy or safety needs, including non-food items.",
      rows: 2,
    },
  },
  housing: {
    type: "textarea",
    validation: z.string(),
    defaults: {
      title: "Camp housing needs or requests",
      label: "e.g. accessibility needs, I plan on camping, etc.",
      rows: 2,
    },
  },
  roommate: {
    type: "textarea",
    validation: z.string(),
    defaults: {
      title: "Room sharing preferences",
      label: "If there are people you would like to room with, list their names here.",
      rows: 2,
    },
  },
  photo: {
    type: "radio",
    validation: z.string().min(1, "Please select photo consent preference."),
    followUp: {
      triggerValue: "Other",
      storageKey: "photoComments",
      label: "Please explain any concerns or requests about photos here.",
      rows: 2,
      requiredMessage: "Please provide details for your photo consent preferences.",
    },
    defaults: {
      title: "Photo Consent",
      label: "Please let us know if you have any concerns about your photo being taken or posted publicly.",
    },
  },
  bedding: {
    type: "checkbox",
    validation: z.array(z.string()),
    defaults: {
      title: "Bedding and Towels",
      label: "Campers will need a pillow, a towel, and sheets or a sleeping bag.",
    },
  },
  hospitality: {
    type: "checkbox",
    validation: z.array(z.string()),
    defaults: {
      title: "Housing",
      label: "Do you need housing or can you offer housing?",
    },
  },
  scholarship: {
    type: "checkbox",
    validation: z.array(z.string()),
    defaults: {
      title: "Scholarships (limited availability)",
      label: "If you are limited financially, we have a small number of half price scholarships available.",
    },
  },
  tests: {
    type: "checkbox",
    validation: z.array(z.string()),
    defaults: {
      title: "Covid Tests",
      label: "You will need to test shortly before arriving at camp. If you cannot bring your own tests, please let us know.",
    },
  },
  comments: {
    type: "textarea",
    validation: z.string(),
    defaults: {
      title: "Anything else?",
      label: "Tell us anything else you'd like us to know.",
      rows: 5,
    },
  },
  misc: {
    type: "checkbox",
    validation: z.array(z.string()),
    followUp: {
      triggerValue: "minor",
      storageKey: "miscComments",
      label: "What is your age?",
      rows: 1,
      requiredMessage: "Please provide your age if you are under 18.",
    },
    defaults: {
      title: "Do any of the following apply to you?",
    },
  },
  agreement: {
    type: "checkbox",
    validation: z.array(z.string()),
    crossValidation: (person, personIndex) => {
      if (personIndex !== 0) return null;
      const value = person.agreement as string[];
      return Array.isArray(value) && value.includes("yes")
        ? null
        : "You must agree to the values and expectations.";
    },
    defaults: {
      title: "Values and Expectations",
      label: "Do you agree that everyone you are registering will follow the event's values and expectations?",
      options: [{ label: "Yes", value: "yes" }],
    },
  },
};
