import { describe, it, expect } from "vitest";
import { fieldsSchema } from "./schema";

describe("fieldsSchema", () => {
  it("accepts an empty configuration", () => {
    expect(fieldsSchema.safeParse({ contactOrder: [], miscOrder: [], config: {} }).success).toBe(true);
  });

  it("accepts per-field config with every optional property set", () => {
    const value = {
      contactOrder: ["first", "last"],
      miscOrder: ["age"],
      config: {
        first: { label: "First name", width: 6, required: true },
        last: { label: "Last name", width: 6, includeOnNametag: true },
        age: {
          title: "Age",
          label: "Pick one",
          options: [{ label: "Adult", value: "adult" }],
          defaultValue: "adult",
          rows: 1,
          placeholder: "",
        },
      },
    };
    expect(fieldsSchema.safeParse(value).success).toBe(true);
  });

  it("accepts a field config with no properties at all", () => {
    expect(fieldsSchema.safeParse({ contactOrder: ["first"], miscOrder: [], config: { first: {} } }).success).toBe(true);
  });

  it("rejects malformed options", () => {
    const value = { contactOrder: [], miscOrder: ["age"], config: { age: { options: [{ label: "Adult" }] } } };
    expect(fieldsSchema.safeParse(value).success).toBe(false);
  });

  it("rejects a non-numeric width", () => {
    const value = { contactOrder: ["first"], miscOrder: [], config: { first: { width: "6" } } };
    expect(fieldsSchema.safeParse(value).success).toBe(false);
  });
});
