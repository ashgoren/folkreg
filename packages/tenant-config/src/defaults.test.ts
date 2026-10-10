import { describe, it, expect } from "vitest";
import { FIELD_DEFS } from "@repo/fields";
import { defaultAdmissionsConfig, defaultFieldConfig, defaultFieldsConfig, defaultTenantConfig } from "./defaults";
import { admissionsConfigSchema, tenantConfigSchema } from "./schemas";

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
});

describe("defaultFieldsConfig", () => {
  // contactOrder and miscOrder render as separate sections of the registration form, so a field
  // listed in the wrong one would show up in the wrong place (and the Fields page would treat it
  // as belonging to a group it doesn't).
  it("lists each field under its own catalog group", () => {
    const { contactOrder, miscOrder } = defaultFieldsConfig();
    expect(contactOrder.filter((name) => FIELD_DEFS[name]?.group !== "contact")).toEqual([]);
    expect(miscOrder.filter((name) => FIELD_DEFS[name]?.group !== "misc")).toEqual([]);
  });

  it("has a config entry for exactly the active fields", () => {
    const { contactOrder, miscOrder, config } = defaultFieldsConfig();
    expect(Object.keys(config).sort()).toEqual([...contactOrder, ...miscOrder].sort());
  });

  it("starts the default set's required fields as required", () => {
    const { config } = defaultFieldsConfig();
    const required = Object.entries(config).filter(([, field]) => field.required).map(([name]) => name);
    expect(required).toEqual([
      "first", "last", "nametag", "email", "emailConfirmation", "phone", "address", "city", "state", "zip", "agreement",
    ]);
  });

  it("starts each field from its catalog defaults, with last name and pronouns on the nametag", () => {
    const { config } = defaultFieldsConfig();
    expect(config.email).toEqual(defaultFieldConfig("email"));
    expect(config.last).toEqual({ ...defaultFieldConfig("last"), includeOnNametag: true });
    expect(config.pronouns).toEqual({ ...defaultFieldConfig("pronouns"), includeOnNametag: true });
    expect(config.first).not.toHaveProperty("includeOnNametag");
  });
});

describe("defaultFieldConfig", () => {
  it("throws for a field that isn't in the catalog", () => {
    expect(() => defaultFieldConfig("nope")).toThrow("Unknown field: nope");
  });
});

// The forms and test fixtures modify what these return, so each call has to hand back its own
// objects -- a shared one would carry one caller's edits into the next.
describe("fresh objects per call", () => {
  it("doesn't share nested objects between calls", () => {
    const a = defaultTenantConfig();
    const b = defaultTenantConfig();
    a.fields_config.contactOrder.push("extra");
    a.theme_config.accentLight = "#000000";
    expect(b.fields_config.contactOrder).not.toContain("extra");
    expect(b.theme_config.accentLight).not.toBe("#000000");
  });

  it("doesn't share a field's options with the @repo/fields catalog", () => {
    const options = defaultFieldConfig("age").options!;
    expect(options).toEqual(FIELD_DEFS.age!.defaults!.options);
    expect(options).not.toBe(FIELD_DEFS.age!.defaults!.options);
  });

  it("doesn't share the sliding-scale cost range", () => {
    const config = defaultAdmissionsConfig();
    if (config.mode !== "sliding-scale") throw new Error("expected sliding-scale");
    config.costRange[0] = 1;
    const next = defaultAdmissionsConfig();
    expect(next.mode === "sliding-scale" && next.costRange[0]).toBe(120);
  });
});
