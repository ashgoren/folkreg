import type { FieldDef } from "./types";

export const MISC_FIELD_DEFS = {
  age: {
    type: "radio",
    requiredMessage: "Please select age range.",
    // Tiered pricing prices each person by the age option they choose, so a tenant's age options
    // are its price brackets.
    canLimitFirstPerson: true,
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
      firstPersonOptions: ["adult", "13-17"],
    },
  },
  share: {
    type: "checkbox",
    prerequisiteOption: "name",
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
      defaultValue: ["name", "pronouns", "email", "phone", "address"],
    },
  },
  carpool: {
    type: "checkbox",
    defaults: {
      title: "Transportation and Hosting",
      label: "If you check any of these boxes we will be in touch closer to camp to coordinate. We will do our best to meet everyone's carpool needs. For housing, we will put people directly in touch with possible matches if there are any. NOTE: historically, carpools and housing are tight. If you are able to offer a ride or a place to stay, please check the box!",
      options: [
        { label: "I can offer a ride to camp", value: "offer-ride" },
        { label: "I might be able to give a ride to camp", value: "offer-ride-maybe" },
        { label: "I need a ride to camp", value: "need-ride" },
        { label: "I might need a ride to camp", value: "need-ride-maybe" },
        { label: "I am willing and able to rent a car to drive to camp if necessary", value: "rent-car" },
        { label: "I can offer a place to stay in the area before or after camp", value: "offer-housing" },
        { label: "I could use help finding a place to stay in the area before or after camp", value: "need-housing" },
      ],
    },
  },
  volunteer: {
    type: "checkbox",
    defaults: {
      title: "Volunteering",
      label: "Everyone will be asked to help with camp, but we need a few people who can commit in advance or in larger ways.",
      options: [
        { label: "I can come early to help with camp set up", value: "setup" },
        { label: "I can stay late to help with camp take down", value: "strike" },
        { label: "I can take on a lead volunteer role during camp (e.g. button maker or snack coordinator)", value: "lead" },
        { label: "I can help coordinate in the months before camp", value: "pre" },
      ],
    },
  },
  dietaryPreferences: {
    type: "radio",
    requiredMessage: "Please select dietary preference.",
    defaults: {
      required: true,
      title: "Dietary Preferences",
      label: "Please choose one.",
      options: [
        { label: "Vegan", value: "Vegan" },
        { label: "Vegetarian", value: "Vegetarian" },
        { label: "No Red Meat", value: "No Red Meat" },
        { label: "Omnivore", value: "Omnivore" },
      ],
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
      label: "Please note, we will try our best to accommodate you with the prepared meals, but the kitchen has limited options. They do their best, but if you're very worried about your restrictions (if highly allergic, or highly specific requirements) we recommend bringing your own food as well. We have a refrigerator and storage space available for personal use that campers who need it may use. There's room to elaborate on allergies or safety needs below.",
      options: [
        { label: "Gluten-free", value: "gluten" },
        { label: "Soy-free", value: "soy" },
        { label: "Dairy-free", value: "dairy" },
        { label: "Kosher for Passover (stringent)", value: "kosher-strict" },
        { label: "Kosher for Passover (chill, just won't eat bread)", value: "kosher" },
        { label: "Other (please describe below)", value: "other" },
      ],
    },
  },
  allergies: {
    type: "textarea",
    defaults: {
      title: "Allergy / Safety Information",
      label: "So there's \"I don't eat gluten\" and then there's \"if a single crumb of gluten cross-contaminates my food I will be sick all weekend.\" Please elaborate as much as you need to feel comfortable that we know your safety and allergy needs. This can include non-food things as well.",
      rows: 2,
    },
  },
  housing: {
    type: "textarea",
    defaults: {
      title: "Camp housing needs or requests",
      label: "(e.g. accessibility needs, I plan on camping, etc.)",
      rows: 2,
    },
  },
  roommate: {
    type: "textarea",
    defaults: {
      title: "Room sharing preferences",
      label: "We now pre-assign housing and try our best to meet everyone's needs and preferences. If there are people you would like to room with, list their names here.",
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
      label: "People at the event take photos. Please let us know if you have any concerns about your photo being taken or posted publicly.",
      options: [
        { label: "Photos are fine!", value: "Yes" },
        { label: "Photos are fine, but I don't want to be tagged online", value: "No tags" },
        { label: "Please do not post photos of me.", value: "No" },
        { label: "Other", value: "Other" },
      ],
    },
  },
  bedding: {
    type: "checkbox",
    defaults: {
      title: "Bedding and Towels",
      label: "Campers will need a pillow, a towel, and sheets and blanket or a sleeping bag. If at all possible, please bring your own or arrange with a friend directly to borrow.",
      options: [
        { label: "I can offer bedding and a towel to a camper from out of town", value: "offer-bedding" },
        { label: "I might be able to offer bedding and a towel", value: "offer-bedding-maybe" },
        { label: "I am coming from out of town and will need help finding bedding and a towel", value: "need-bedding" },
        { label: "I might need bedding and a towel", value: "need-bedding-maybe" },
      ],
    },
  },
  hospitality: {
    type: "checkbox",
    defaults: {
      title: "Housing",
      label: "Do you need housing or can you offer housing?",
      options: [
        { label: "I can offer housing", value: "offering" },
        { label: "I need housing (limited availability)", value: "requesting" },
      ],
    },
  },
  scholarship: {
    type: "checkbox",
    defaults: {
      title: "Scholarships (limited availability)",
      label: "We feel we've kept the price of camp remarkably low. However, if you are limited financially, we have a small number of half price scholarships available for camp. If you'd like to be considered for one of these, please let us know.",
      options: [{ label: "Yes, please consider me for a scholarship", value: "yes" }],
    },
  },
  tests: {
    type: "checkbox",
    defaults: {
      title: "Covid Tests",
      label: "You will need to test shortly before arriving at camp AND again on Saturday afternoon. Please also bring an extra test or two, for your own use if you should feel ill during the weekend. If you can not bring your own tests, please let us know here.",
      options: [
        { label: "I need 1 test", value: "1" },
        { label: "I need 2 tests", value: "2" },
      ],
    },
  },
  comments: {
    type: "textarea",
    defaults: {
      title: "Anything else?",
      label: "Tell us anything else you'd like us to know. We want to be sure we don't miss anything that could make the weekend welcoming and enjoyable.",
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
      options: [
        { label: "I am under 18 years old", value: "minor" },
        { label: "I am new to contra and interested in a beginner's lesson", value: "beginner" },
        { label: "I do not want photos of me to be posted online (note that we already ask that no one tag photos)", value: "no-photos" },
      ],
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
} satisfies Record<string, Omit<FieldDef, "group">>;
