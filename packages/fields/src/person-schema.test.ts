import { describe, it, expect } from "vitest";
import type { FieldName } from "./catalog";
import { personSchema, type FieldSettings } from "./person-schema";

// Active fields from a field -> settings map, the way fields_config lists them.
const fields = (settings: Partial<Record<FieldName, Omit<FieldSettings, "name">>>) =>
  Object.entries(settings).map(([name, rest]) => ({ name: name as FieldName, ...rest }));

// The errors a person gets, keyed by field: what the registration form shows under each input.
const errors = (settings: Partial<Record<FieldName, Omit<FieldSettings, "name">>>, person: Record<string, unknown>, personIndex = 0) => {
  const result = personSchema(fields(settings), personIndex).safeParse(person);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
};

describe("personSchema", () => {
  describe("required", () => {
    // The tenant's setting decides, not the catalog: first name is required only when switched on.
    it("rejects a blank required field with its own message", () => {
      expect(errors({ first: { required: true } }, { first: "" })).toEqual({ first: "Please enter first name." });
      expect(errors({ first: { required: true } }, { first: "   " })).toEqual({ first: "Please enter first name." });
    });

    it("accepts a blank field the tenant hasn't made required", () => {
      expect(errors({ first: { required: false } }, { first: "" })).toEqual({});
      expect(errors({ first: {} }, { first: "" })).toEqual({});
    });

    // Any field can be switched to required, including ones the catalog gives no message of their own.
    it.each([
      ["pronouns", "", "Please fill this in."],
      ["share", [], "Please choose at least one."],
      ["age", "", "Please select age range."],
    ])("gives %s a message when required and blank", (name, blank, message) => {
      expect(errors({ [name]: { required: true } }, { [name]: blank })).toEqual({ [name]: message });
    });

    it("accepts a required checkbox field with at least one box checked", () => {
      expect(errors({ share: { required: true } }, { share: ["name"] })).toEqual({});
    });

  });

  describe("first-person rules", () => {
    // "Will everyone you're registering follow the values and expectations?" is asked of the person
    // registering, on behalf of the rest -- nobody else is shown it.
    it("asks the agreement of the first person only", () => {
      const settings = { agreement: { required: true } };
      expect(errors(settings, { agreement: [] }, 0)).toEqual({ agreement: "Please check this box to continue." });
      expect(errors(settings, { agreement: ["yes"] }, 0)).toEqual({});
      expect(errors(settings, { agreement: [] }, 1)).toEqual({});
      expect(errors(settings, {}, 1)).toEqual({}); // not shown to them, so no value at all
    });

    // Like any field, the agreement is required only when the tenant switches it on.
    it("lets the first person leave the agreement unchecked when it isn't required", () => {
      expect(errors({ agreement: { required: false } }, { agreement: [] }, 0)).toEqual({});
    });

    it("limits the first person's age to an adult or a teen", () => {
      expect(errors({ age: {} }, { age: "6-12" }, 0)).toEqual({ age: "The person registering must be 13 or older." });
      expect(errors({ age: {} }, { age: "13-17" }, 0)).toEqual({});
      expect(errors({ age: {} }, { age: "adult" }, 0)).toEqual({});
      expect(errors({ age: {} }, { age: "6-12" }, 1)).toEqual({});
    });
  });

  describe("format", () => {
    it("checks a value's format", () => {
      expect(errors({ email: {} }, { email: "dancer@" })).toEqual({ email: "Please enter a valid email address." });
      expect(errors({ first: {} }, { first: "<b>" })).toEqual({ first: "Invalid characters :(" });
      expect(errors({ phone: {} }, { phone: "555-0100" })).toEqual({});
      expect(errors({ phone: {} }, { phone: "+44 20 7946 0000" })).toEqual({ phone: "Please enter a valid phone number." });
    });

    // A blank optional email is fine; it's only checked as an email once something's typed.
    it("skips the format check for a blank value", () => {
      expect(errors({ email: {} }, { email: "" })).toEqual({});
    });

    // Reported as missing, not as a badly formatted email.
    it("reports a blank required field as missing rather than malformed", () => {
      expect(errors({ email: { required: true } }, { email: "" })).toEqual({ email: "Please enter email address." });
    });
  });

  // Roster details can't be shared without the name; the form checks it along with the others.
  describe("a prerequisite option", () => {
    it("rejects other options checked without it", () => {
      expect(errors({ share: {} }, { share: ["email"] })).toEqual({ share: "This combination of choices isn't allowed." });
    });

    it("accepts it with or without others, or nothing checked", () => {
      expect(errors({ share: {} }, { share: ["name", "email"] })).toEqual({});
      expect(errors({ share: {} }, { share: ["name"] })).toEqual({});
      expect(errors({ share: {} }, { share: [] })).toEqual({});
    });
  });

  describe("follow-ups", () => {
    // Choosing the trigger option reveals a text box, stored under its own key, that must be filled in.
    it.each([
      ["dietaryRestrictions", ["other"], "dietaryRestrictionsOther", "Please provide details about your dietary restrictions."],
      ["photo", "Other", "photoComments", "Please provide details for your photo consent preferences."],
      ["misc", ["minor"], "miscComments", "Please provide your age if you are under 18."],
    ])("requires %s's follow-up when the trigger is chosen", (name, trigger, storageKey, message) => {
      expect(errors({ [name]: {} }, { [name]: trigger, [storageKey]: "" })).toEqual({ [storageKey]: message });
      expect(errors({ [name]: {} }, { [name]: trigger, [storageKey]: "details" })).toEqual({});
    });

    it("doesn't require a follow-up when the trigger isn't chosen", () => {
      expect(errors({ dietaryRestrictions: {} }, { dietaryRestrictions: ["vegetarian"] })).toEqual({});
    });
  });

  describe("email confirmation", () => {
    const settings = { email: {}, emailConfirmation: {} };

    it("must match the email address exactly", () => {
      expect(errors(settings, { email: "a@example.org", emailConfirmation: "a@example.org" })).toEqual({});
      expect(errors(settings, { email: "a@example.org", emailConfirmation: "b@example.org" }))
        .toEqual({ emailConfirmation: "Email addresses must match." });
      expect(errors(settings, { email: "A@example.org", emailConfirmation: "a@example.org" }))
        .toEqual({ emailConfirmation: "Email addresses must match." });
    });

    // Both left blank match; whether blank is allowed is each field's required setting.
    it("accepts both blank", () => {
      expect(errors(settings, { email: "", emailConfirmation: "" })).toEqual({});
    });

    it("applies to every person, not just the first", () => {
      expect(errors(settings, { email: "a@example.org", emailConfirmation: "b@example.org" }, 2))
        .toEqual({ emailConfirmation: "Email addresses must match." });
    });
  });

  // E.g. a single string where a checkbox field holds a list of checked options.
  it("rejects a value of the wrong type", () => {
    expect(personSchema(fields({ agreement: { required: true } }), 0).safeParse({ agreement: "yes" }).success).toBe(false);
  });

  // A person carries more than its fields (e.g. the admission amount), which the schema leaves alone.
  it("keeps values that aren't fields", () => {
    const result = personSchema(fields({ first: {} }), 0).parse({ first: "Ada", admission: 120 });
    expect(result).toEqual({ first: "Ada", admission: 120 });
  });

  it("reports every problem at once, each at its own field", () => {
    const settings = { first: { required: true }, email: { required: true }, agreement: { required: true } };
    expect(errors(settings, { first: "", email: "nope", agreement: [] })).toEqual({
      first: "Please enter first name.",
      email: "Please enter a valid email address.",
      agreement: "Please check this box to continue.",
    });
  });
});
