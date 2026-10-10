import { describe, it, expect } from "vitest";
import { FIELD_DEFS } from "@repo/fields";
import { defaultAdmissionsConfig, defaultFieldConfig, defaultFieldsConfig, defaultTenantConfig } from "./defaults";
import { admissionsConfigSchema, fieldsConfigSchema, tenantConfigSchema } from "./schemas";

// Every new tenant is created with these, and getTenant() parses every row it reads, so the
// defaults have to pass the same schemas as anything an organizer saves.
describe("defaultTenantConfig", () => {
  it("passes every config schema", () => {
    expect(tenantConfigSchema.safeParse({ ...defaultTenantConfig(), spreadsheet_config: null }).error).toBeUndefined();
  });

  // Switching Admissions modes keeps the other modes' starting values, so each has to be valid.
  it.each(["sliding-scale", "fixed", "tiered"] as const)("has valid admissions values in %s mode", (mode) => {
    expect(admissionsConfigSchema.safeParse({ ...defaultAdmissionsConfig(), mode }).success).toBe(true);
  });

  // Tiered pricing prices people by their answer to the age field, so the default categories only
  // work if their age groups are the options that field starts with.
  it("prices only age groups the age field starts with, each of them at least once", () => {
    const ageValues = defaultFieldConfig("age").options!.map((option) => option.value);
    const priced = defaultAdmissionsConfig().categories.flatMap((category) => category.ageGroups);
    expect(new Set(priced)).toEqual(new Set(ageValues));
  });
});

describe("defaultFieldsConfig", () => {
  // The same checks a stored config gets on read: real catalog names, each in its own group, once.
  it("is a valid fields config", () => {
    expect(fieldsConfigSchema.safeParse(defaultFieldsConfig()).success).toBe(true);
  });

  it("starts the default set's required fields as required", () => {
    const { contact, misc } = defaultFieldsConfig();
    const required = [...contact, ...misc].filter((field) => field.required).map((field) => field.name);
    expect(required).toEqual([
      "first", "last", "nametag", "email", "emailConfirmation", "phone", "address", "city", "state", "zip", "agreement",
    ]);
  });

  it("starts each field from its catalog defaults, with last name and pronouns on the nametag", () => {
    const { contact } = defaultFieldsConfig();
    const entry = (name: string) => contact.find((field) => field.name === name);
    expect(entry("email")).toEqual({ name: "email", ...defaultFieldConfig("email") });
    expect(entry("last")).toEqual({ name: "last", ...defaultFieldConfig("last"), includeOnNametag: true });
    expect(entry("pronouns")).toEqual({ name: "pronouns", ...defaultFieldConfig("pronouns"), includeOnNametag: true });
    expect(entry("first")).not.toHaveProperty("includeOnNametag");
  });
});

// The forms and test fixtures modify what these return, so each call has to hand back its own
// objects -- a shared one would carry one caller's edits into the next.
describe("fresh objects per call", () => {
  it("doesn't share nested objects between calls", () => {
    const a = defaultTenantConfig();
    const b = defaultTenantConfig();
    a.fields_config.contact[0]!.label = "Changed";
    a.theme_config.accentLight = "#000000";
    expect(b.fields_config.contact[0]!.label).not.toBe("Changed");
    expect(b.theme_config.accentLight).not.toBe("#000000");
  });

  it("doesn't share a field's options with the @repo/fields catalog", () => {
    const options = defaultFieldConfig("age").options!;
    expect(options).toEqual(FIELD_DEFS.age.defaults!.options);
    expect(options).not.toBe(FIELD_DEFS.age.defaults!.options);
  });

  it("doesn't share the sliding-scale cost range", () => {
    const config = defaultAdmissionsConfig();
    if (config.mode !== "sliding-scale") throw new Error("expected sliding-scale");
    config.costRange[0] = 1;
    const next = defaultAdmissionsConfig();
    expect(next.mode === "sliding-scale" && next.costRange[0]).toBe(120);
  });
});
