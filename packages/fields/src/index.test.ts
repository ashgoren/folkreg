import { describe, it, expect } from "vitest";
import { CONTACT_FIELD_DEFS, FIELD_DEFS, FIELD_NAMES, MISC_FIELD_DEFS, STATE_OPTIONS } from "./index";

describe("FIELD_DEFS", () => {
  it("merges both catalogs, tagging each field with its group", () => {
    expect(Object.keys(FIELD_DEFS)).toEqual([...Object.keys(CONTACT_FIELD_DEFS), ...Object.keys(MISC_FIELD_DEFS)]);
    for (const name of FIELD_NAMES) expect(FIELD_DEFS[name].group).toBe(name in CONTACT_FIELD_DEFS ? "contact" : "misc");
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

  // A field's default is its starting value on the registration form: a list of checked options
  // for a checkbox field, a single value otherwise. A choice field's default has to be among its
  // own options, or the field would start with nothing showing as chosen.
  it("gives each field a default of the right kind, from its own options", () => {
    for (const [name, def] of Object.entries(FIELD_DEFS)) {
      const defaultValue = def.defaults?.defaultValue;
      if (defaultValue === undefined) continue;
      expect(Array.isArray(defaultValue), name).toBe(def.type === "checkbox");
      if (def.type !== "radio" && def.type !== "checkbox") continue;
      const values = def.defaults?.options?.map((option) => option.value) ?? [];
      for (const value of [defaultValue].flat()) expect(values, name).toContain(value);
    }
  });

  it("excludes only emailConfirmation from the spreadsheet", () => {
    const excluded = Object.entries(FIELD_DEFS).filter(([, def]) => def.excludeFromSpreadsheet).map(([name]) => name);
    expect(excluded).toEqual(["emailConfirmation"]);
  });

  // `required` in the defaults is where a tenant's Required switch starts when the field is
  // activated: the name, email, phone and address fields needed to identify and reach a registrant,
  // plus the age, dietary preference, photo consent and agreement questions.
  it("starts exactly these fields as required", () => {
    const required = Object.entries(FIELD_DEFS).filter(([, def]) => def.defaults?.required).map(([name]) => name);
    expect(required).toEqual([
      "first", "last", "nametag", "email", "emailConfirmation", "phone", "address", "city", "state", "zip",
      "age", "dietaryPreferences", "photo", "agreement",
    ]);
  });

  // A nametag shows the registrant's name, and optionally these; the admin offers the "Include on
  // nametag?" switch only for fields flagged here.
  it("offers the nametag option for last name and pronouns only", () => {
    const nametag = Object.entries(FIELD_DEFS).filter(([, def]) => def.canIncludeOnNametag).map(([name]) => name);
    expect(nametag).toEqual(["last", "pronouns"]);
  });
});

// What each field's value must look like is tested through personSchema (person-schema.test.ts),
// since a field's rules only mean something combined with a tenant's settings. These check the
// catalog entries themselves.
describe("catalog rules", () => {
  // A field that starts required shows in a new tenant's form as required, so its message is one a
  // registrant actually sees -- worth writing for the field rather than falling back to a generic one.
  it("gives every field that starts required its own required message", () => {
    const missing = Object.entries(FIELD_DEFS)
      .filter(([, def]) => def.defaults?.required && !def.requiredMessage)
      .map(([name]) => name);
    expect(missing).toEqual([]);
  });

  // Picking the trigger option reveals a follow-up text field, stored under its own key.
  it.each([
    ["dietaryRestrictions", "other", "dietaryRestrictionsOther"],
    ["photo", "Other", "photoComments"],
    ["misc", "minor", "miscComments"],
  ] as const)("%s reveals a follow-up stored as %s when %s is selected", (name, trigger, storageKey) => {
    expect(FIELD_DEFS[name].followUp).toMatchObject({ triggerValue: trigger, storageKey });
  });

  // The follow-up appears when its trigger option is chosen, so a field that starts without that
  // option could never show it.
  it("starts every field with a follow-up with its trigger option", () => {
    for (const [name, def] of Object.entries(FIELD_DEFS)) {
      if (!def.followUp) continue;
      expect(def.defaults?.options?.map((option) => option.value), name).toContain(def.followUp.triggerValue);
    }
  });

  // An option list is part of what makes a choice field usable as soon as it's added.
  it("starts every radio and checkbox field with options to choose from", () => {
    const without = Object.entries(FIELD_DEFS)
      .filter(([, def]) => (def.type === "radio" || def.type === "checkbox") && !def.defaults?.options?.length)
      .map(([name]) => name);
    expect(without).toEqual([]);
  });

  it("asks only the agreement of the first person alone", () => {
    const firstOnly = Object.entries(FIELD_DEFS).filter(([, def]) => def.firstPersonOnly).map(([name]) => name);
    expect(firstOnly).toEqual(["agreement"]);
  });

  // The first person's allowed ages are named by value, so they have to stay among age's options --
  // a renamed option would otherwise quietly stop matching.
  // The person registering is an adult or a teen to start with; a tenant can change which.
  it("starts the first person's age limit on options the age field has", () => {
    const { options, firstPersonOptions } = MISC_FIELD_DEFS.age.defaults;
    expect(firstPersonOptions).toEqual(["adult", "13-17"]);
    expect(firstPersonOptions.every((value) => options.some((option) => option.value === value))).toBe(true);
  });

  it("lets only the age field limit the first person's choices", () => {
    const limited = Object.entries(FIELD_DEFS).filter(([, def]) => def.canLimitFirstPerson).map(([name]) => name);
    expect(limited).toEqual(["age"]);
  });

  // Checking any roster detail checks the name too (toggleOption), so the name has to be an option
  // and part of any non-empty default.
  it("makes the roster's name option a prerequisite for the others", () => {
    const share = MISC_FIELD_DEFS.share;
    expect(share.prerequisiteOption).toBe("name");
    expect(share.defaults.options.map((option) => option.value)).toContain("name");
    expect(share.defaults.defaultValue).toContain("name");
  });

  it("gives only checkbox fields a prerequisite option", () => {
    const withPrerequisite = Object.entries(FIELD_DEFS).filter(([, def]) => def.prerequisiteOption);
    expect(withPrerequisite.map(([name, def]) => [name, def.type])).toEqual([["share", "checkbox"]]);
  });

  it("offers state suggestions from STATE_OPTIONS", () => {
    expect(CONTACT_FIELD_DEFS.state!.suggestions).toBe(STATE_OPTIONS);
    expect(STATE_OPTIONS.length).toBeGreaterThan(50);
  });
});
