import { describe, it, expect } from "vitest";
import { defaultFieldsConfig } from "@repo/tenant-config";
import type { Order, Person } from "@repo/types";
import { activeFields, buildRegistrationSchema, buildDefaultPerson, parseSavedOrder, isPersonValid } from "./registration-party";

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

describe("activeFields", () => {
  it("throws if the tenant's config has deactivated email", () => {
    expect(() => activeFields({ contact: [], misc: [] })).toThrow(/email/);
  });

  it("flattens contact and misc into one ordered list, keeping each field's full settings", () => {
    const fields = activeFields(defaultFieldsConfig());
    const email = fields.find((field) => field.name === "email");
    expect(email).toMatchObject({ required: true, label: "Email" });
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

describe("isPersonValid", () => {
  it("is true for a fully valid registrant", () => {
    expect(isPersonValid(defaultFieldsConfig(), validPerson({ agreement: ["yes"] }) as Person, 0)).toBe(true);
  });

  it("is false when a required field is blank", () => {
    expect(isPersonValid(defaultFieldsConfig(), validPerson({ agreement: ["yes"], first: "" }) as Person, 0)).toBe(false);
  });

  it("doesn't require agreement for a companion", () => {
    expect(isPersonValid(defaultFieldsConfig(), validPerson() as Person, 1)).toBe(true);
  });
});

describe("parseSavedOrder", () => {
  // Only updated_at and people matter here -- the rest of Order (payments, submission_mode,
  // etc.) isn't read, so the cast keeps the fixture focused on what's actually under test.
  const order = (people: Person[]) => ({ id: "order-1", updated_at: "2026-01-01T00:00:00Z", people }) as Order;

  it("splits the stored people into registrant and companions, keeping updatedAt", () => {
    const registrant = validPerson({ first: "Jane" }) as Person;
    const companion = validPerson({ first: "John" }) as Person;
    expect(parseSavedOrder(order([registrant, companion]))).toEqual({
      updatedAt: "2026-01-01T00:00:00Z",
      party: { registrant, companions: [companion] },
    });
  });

  it("has no companions for a party of one", () => {
    const registrant = validPerson() as Person;
    expect(parseSavedOrder(order([registrant])).party.companions).toEqual([]);
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
