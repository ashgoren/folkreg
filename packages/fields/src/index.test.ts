import { describe, it, expect } from "vitest";
import { CONTACT_FIELD_DEFS, FIELD_DEFS, MISC_FIELD_DEFS, STATE_OPTIONS } from "./index";

describe("FIELD_DEFS", () => {
  it("merges both catalogs, tagging each field with its group", () => {
    expect(Object.keys(FIELD_DEFS)).toEqual([...Object.keys(CONTACT_FIELD_DEFS), ...Object.keys(MISC_FIELD_DEFS)]);
    for (const name of Object.keys(CONTACT_FIELD_DEFS)) expect(FIELD_DEFS[name]?.group).toBe("contact");
    for (const name of Object.keys(MISC_FIELD_DEFS)) expect(FIELD_DEFS[name]?.group).toBe("misc");
  });

  // Field names are the keys stored in fields_config and in each order's people[] -- a name
  // shared by both catalogs would make one silently shadow the other in the merge.
  it("has no field name in both catalogs", () => {
    const shared = Object.keys(CONTACT_FIELD_DEFS).filter((name) => name in MISC_FIELD_DEFS);
    expect(shared).toEqual([]);
  });

  // A followUp's storageKey becomes its own key on the person (and its own spreadsheet
  // column), so it can't collide with a real field name.
  it("has no followUp storageKey that collides with a field name", () => {
    const storageKeys = Object.values(FIELD_DEFS).flatMap((def) => (def.followUp ? [def.followUp.storageKey] : []));
    expect(storageKeys.filter((key) => key in FIELD_DEFS)).toEqual([]);
    expect(new Set(storageKeys).size).toBe(storageKeys.length);
  });

  // Contact fields are laid out on a 12-column grid (the admin Fields page's Width control).
  it("gives every contact field a default width between 1 and 12", () => {
    for (const [name, def] of Object.entries(CONTACT_FIELD_DEFS)) {
      expect(def.defaults?.width, name).toBeGreaterThanOrEqual(1);
      expect(def.defaults?.width, name).toBeLessThanOrEqual(12);
    }
  });

  // A default value for a radio field has to be one of its options, or the field would
  // render with nothing selected despite having a default.
  it("only defaults a radio field to one of its own options", () => {
    for (const [name, def] of Object.entries(FIELD_DEFS)) {
      if (def.type !== "radio" || !def.defaults?.value || !def.defaults.options) continue;
      expect(def.defaults.options.map((o) => o.value), name).toContain(def.defaults.value);
    }
  });

  it("excludes only emailConfirmation from the spreadsheet", () => {
    const excluded = Object.entries(FIELD_DEFS).filter(([, def]) => def.excludeFromSpreadsheet).map(([name]) => name);
    expect(excluded).toEqual(["emailConfirmation"]);
  });
});

describe("contact field validation", () => {
  const validate = (name: string, value: unknown) => FIELD_DEFS[name]!.validation.safeParse(value);
  const message = (name: string, value: unknown) => validate(name, value).error?.issues[0]?.message;

  it.each([
    ["first", "Please enter first name."],
    ["last", "Please enter last name."],
    ["nametag", "Please enter name for roster."],
    ["phone", "Please enter phone number."],
    ["address", "Please enter street address."],
    ["city", "Please enter city."],
    ["state", "Please enter state or province."],
    ["zip", "Please enter zip/postal code."],
  ])("%s rejects a blank value with a field-specific message", (name, expected) => {
    expect(message(name, "")).toBe(expected);
    expect(validate(name, "x").success).toBe(true);
  });

  it.each(["pronouns", "apartment"])("%s allows a blank value", (name) => {
    expect(validate(name, "").success).toBe(true);
  });

  it.each(["email", "emailConfirmation"])("%s requires a valid address", (name) => {
    expect(validate(name, "dancer@example.org").success).toBe(true);
    expect(message(name, "dancer@")).toBe("Please enter a valid email address.");
    expect(message(name, "")).toBe("Please enter a valid email address.");
  });

  describe("emailConfirmation cross-validation", () => {
    const check = CONTACT_FIELD_DEFS.emailConfirmation!.crossValidation!;

    it("passes when both addresses match", () => {
      expect(check({ email: "a@example.org", emailConfirmation: "a@example.org" }, 0)).toBeNull();
    });

    it("fails when they differ", () => {
      expect(check({ email: "a@example.org", emailConfirmation: "b@example.org" }, 0)).toBe("Email addresses must match.");
    });

    // An exact comparison, not a normalized one -- a case difference counts as a mismatch.
    it("treats a case difference as a mismatch", () => {
      expect(check({ email: "A@example.org", emailConfirmation: "a@example.org" }, 0)).toBe("Email addresses must match.");
    });

    it("applies to every person in the order, not just the first", () => {
      expect(check({ email: "a@example.org", emailConfirmation: "b@example.org" }, 2)).toBe("Email addresses must match.");
    });
  });

  it("offers state suggestions from STATE_OPTIONS", () => {
    expect(CONTACT_FIELD_DEFS.state!.suggestions).toBe(STATE_OPTIONS);
    expect(STATE_OPTIONS.length).toBeGreaterThan(50);
  });
});

describe("misc field validation", () => {
  const validate = (name: string, value: unknown) => MISC_FIELD_DEFS[name]!.validation.safeParse(value);

  it.each(["age", "dietaryPreferences", "photo"])("radio field %s requires a selection", (name) => {
    expect(validate(name, "").success).toBe(false);
    expect(validate(name, "anything").success).toBe(true);
  });

  it("checkbox fields take an array of selected values, including none", () => {
    const checkboxes = Object.entries(MISC_FIELD_DEFS).filter(([, def]) => def.type === "checkbox");
    expect(checkboxes.length).toBeGreaterThan(0);
    for (const [name] of checkboxes) {
      expect(validate(name, []).success, name).toBe(true);
      expect(validate(name, ["a", "b"]).success, name).toBe(true);
      expect(validate(name, "a").success, name).toBe(false);
    }
  });

  it("textarea fields allow a blank value", () => {
    for (const [name, def] of Object.entries(MISC_FIELD_DEFS)) {
      if (def.type === "textarea") expect(validate(name, "").success, name).toBe(true);
    }
  });

  // The conditional pairs from the old app: picking the trigger option reveals a follow-up
  // text field stored under its own key.
  it.each([
    ["dietaryRestrictions", "other", "dietaryRestrictionsOther"],
    ["photo", "Other", "photoComments"],
    ["misc", "minor", "miscComments"],
  ])("%s reveals a follow-up stored as %s when %s is selected", (name, trigger, storageKey) => {
    expect(MISC_FIELD_DEFS[name]!.followUp).toMatchObject({ triggerValue: trigger, storageKey });
  });

  describe("agreement cross-validation", () => {
    const check = MISC_FIELD_DEFS.agreement!.crossValidation!;

    // Only the purchaser (person 0) agrees on behalf of everyone they're registering.
    it("requires the first person to check yes", () => {
      expect(check({ agreement: ["yes"] }, 0)).toBeNull();
      expect(check({ agreement: [] }, 0)).toBe("You must agree to the values and expectations.");
      expect(check({}, 0)).toBe("You must agree to the values and expectations.");
    });

    it("doesn't require anyone after the first person to agree", () => {
      expect(check({ agreement: [] }, 1)).toBeNull();
      expect(check({}, 3)).toBeNull();
    });

    it("rejects a non-array value rather than substring-matching it", () => {
      expect(check({ agreement: "yes" }, 0)).toBe("You must agree to the values and expectations.");
    });
  });
});
