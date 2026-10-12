import { describe, it, expect } from "vitest";
import { defaultFieldsConfig } from "@repo/tenant-config";
import { activeFieldNames, buildRegistrationSchema, buildDefaultPerson } from "./registration-schema";

// personSchema's base shape requires every active field present as its type (a string or string[]),
// whether or not the tenant marked it required -- buildDefaultPerson already supplies that for every
// field, so starting from it and filling in just what defaultFieldsConfig() marks required gives a
// person the schema accepts, with every other test changing only the one thing it's checking.
const validPerson = (overrides: Record<string, unknown> = {}) => ({
  ...buildDefaultPerson(defaultFieldsConfig()),
  first: "Test",
  last: "Person",
  nametag: "Test",
  email: "test@example.com",
  emailConfirmation: "test@example.com",
  phone: "555-555-5555",
  address: "123 Main St",
  city: "Springfield",
  state: "OR",
  zip: "97477",
  ...overrides,
});

describe("activeFieldNames", () => {
  it("throws if the tenant's config has deactivated email", () => {
    expect(() => activeFieldNames({ contact: [], misc: [] })).toThrow(/email/);
  });

  it("flattens contact and misc into one list", () => {
    const names = activeFieldNames(defaultFieldsConfig()).map((field) => field.name);
    expect(names).toEqual(expect.arrayContaining(["first", "agreement"]));
  });
});

describe("buildRegistrationSchema", () => {
  const schema = buildRegistrationSchema(defaultFieldsConfig());
  const issuePaths = (result: { success: boolean; error?: { issues: { path: PropertyKey[] }[] } }) =>
    result.error?.issues.map((issue) => issue.path.join(".")) ?? [];

  it("requires the registrant to check agreement", () => {
    const result = schema.safeParse({ registrant: validPerson({ agreement: [] }), companions: [] });
    expect(issuePaths(result)).toContain("registrant.agreement");
  });

  it("doesn't ask a companion for agreement at all", () => {
    const result = schema.safeParse({
      registrant: validPerson({ agreement: ["yes"] }),
      companions: [validPerson()], // no agreement key -- personSchema never asks for it past index 0
    });
    expect(result.success).toBe(true);
  });

  it("reports a companion's error at its own index, not the registrant's", () => {
    const result = schema.safeParse({
      registrant: validPerson({ agreement: ["yes"] }),
      companions: [validPerson({ email: "" })],
    });
    expect(issuePaths(result)).toContain("companions.0.email");
  });
});

describe("buildDefaultPerson", () => {
  const person = buildDefaultPerson(defaultFieldsConfig());

  it("throws if the tenant's config has deactivated email", () => {
    expect(() => buildDefaultPerson({ contact: [], misc: [] })).toThrow(/email/);
  });

  it("defaults a plain field to an empty string", () => {
    expect(person.first).toBe("");
  });

  it("defaults a checkbox field with no catalog default to an empty array", () => {
    expect(person.carpool).toEqual([]);
  });

  it("defaults a checkbox field to its catalog's pre-checked options", () => {
    expect(person.share).toEqual(["name", "pronouns", "email", "phone", "address"]);
  });
});
