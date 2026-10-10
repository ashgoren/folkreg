import type { FieldDef } from "./types";

export const MISC_FIELD_DEFS: Record<string, Omit<FieldDef, "group">> = {
  age: {
    type: "radio",
    requiredMessage: "Please select age range.",
    firstPersonOptions: { values: ["adult", "13-17"], message: "The person registering must be 13 or older." },
    defaults: {
      required: true,
      title: "Age",
      label: "Please choose one.",
      options: [
        { label: "Adult", value: "adult" },
        { label: "13-17 yr old", value: "13-17" },
        { label: "6-12 yr old", value: "6-12" },
        { label: "3-5 yr old", value: "3-5" },
        { label: "0-2 yr old", value: "0-2" },
      ],
      defaultValue: "adult",
    },
  },
  share: {
    type: "checkbox",
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
      defaultValue: "name, pronouns, email, phone, address",
    },
  },
  carpool: {
    type: "checkbox",
    defaults: {
      title: "Transportation and Hosting",
      label: "If you check any of these boxes we will be in touch closer to camp to coordinate.",
    },
  },
  volunteer: {
    type: "checkbox",
    defaults: {
      title: "Volunteering",
      label: "Everyone will be asked to help with camp, but we need a few people who can commit in advance or in larger ways.",
    },
  },
  dietaryPreferences: {
    type: "radio",
    requiredMessage: "Please select dietary preference.",
    defaults: {
      required: true,
      title: "Dietary Preferences",
      label: "Please choose one.",
    },
  },
  dietaryRestrictions: {
    type: "checkbox",
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
    defaults: {
      title: "Allergy / Safety Information",
      label: "Please elaborate on any allergy or safety needs, including non-food items.",
      rows: 2,
    },
  },
  housing: {
    type: "textarea",
    defaults: {
      title: "Camp housing needs or requests",
      label: "e.g. accessibility needs, I plan on camping, etc.",
      rows: 2,
    },
  },
  roommate: {
    type: "textarea",
    defaults: {
      title: "Room sharing preferences",
      label: "If there are people you would like to room with, list their names here.",
      rows: 2,
    },
  },
  photo: {
    type: "radio",
    requiredMessage: "Please select photo consent preference.",
    followUp: {
      triggerValue: "Other",
      storageKey: "photoComments",
      label: "Please explain any concerns or requests about photos here.",
      rows: 2,
      requiredMessage: "Please provide details for your photo consent preferences.",
    },
    defaults: {
      required: true,
      title: "Photo Consent",
      label: "Please let us know if you have any concerns about your photo being taken or posted publicly.",
    },
  },
  bedding: {
    type: "checkbox",
    defaults: {
      title: "Bedding and Towels",
      label: "Campers will need a pillow, a towel, and sheets or a sleeping bag.",
    },
  },
  hospitality: {
    type: "checkbox",
    defaults: {
      title: "Housing",
      label: "Do you need housing or can you offer housing?",
    },
  },
  scholarship: {
    type: "checkbox",
    defaults: {
      title: "Scholarships (limited availability)",
      label: "If you are limited financially, we have a small number of half price scholarships available.",
    },
  },
  tests: {
    type: "checkbox",
    defaults: {
      title: "Covid Tests",
      label: "You will need to test shortly before arriving at camp. If you cannot bring your own tests, please let us know.",
    },
  },
  comments: {
    type: "textarea",
    defaults: {
      title: "Anything else?",
      label: "Tell us anything else you'd like us to know.",
      rows: 5,
    },
  },
  misc: {
    type: "checkbox",
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
    // Asked once, of the person registering, on behalf of everyone they're registering.
    firstPersonOnly: true,
    requiredMessage: "Please check this box to continue.",
    defaults: {
      required: true,
      title: "Values and Expectations",
      label: "Do you agree that everyone you are registering will follow the event's values and expectations?",
      options: [{ label: "Yes", value: "yes" }],
    },
  },
};
