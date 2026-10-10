import { describe, it, expect } from "vitest";
import { fieldsConfigSchema } from "./schemas";

// The messages a config gets, keyed by path.
const issues = (value: unknown) => {
  const result = fieldsConfigSchema.safeParse(value);
  return result.success ? {} : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
};

describe("fieldsConfigSchema", () => {
  it("accepts no active fields", () => {
    expect(fieldsConfigSchema.safeParse({ contact: [], misc: [] }).success).toBe(true);
  });

  it("accepts entries with every setting set", () => {
    const value = {
      contact: [
        { name: "first", label: "First name", width: 6, required: true },
        { name: "last", label: "Last name", width: 6, includeOnNametag: true },
      ],
      misc: [
        { name: "age", title: "Age", label: "Pick one", options: [{ label: "Adult", value: "adult" }], defaultValue: "adult", placeholder: "" },
        { name: "comments", rows: 3 },
      ],
    };
    expect(fieldsConfigSchema.safeParse(value).success).toBe(true);
  });

  it("accepts an entry with no settings at all", () => {
    expect(fieldsConfigSchema.safeParse({ contact: [{ name: "first" }], misc: [] }).success).toBe(true);
  });

  // A stored name the catalog doesn't define -- e.g. a field since renamed -- fails the read
  // rather than being skipped.
  it("rejects a field name the catalog doesn't define", () => {
    expect(issues({ contact: [{ name: "notAField" }], misc: [] })).toHaveProperty(["contact.0.name"]);
  });

  // Each section of the registration form shows only its own group's fields.
  it("rejects a field listed in the other group", () => {
    expect(issues({ contact: [{ name: "age" }], misc: [] })).toEqual({ "contact.0.name": "age belongs in misc" });
  });

  it("rejects a field listed twice", () => {
    expect(issues({ contact: [{ name: "first" }, { name: "first" }], misc: [] }))
      .toEqual({ "contact.1.name": "first is listed more than once" });
  });

  // The Fields page shows this under the width input. It's one message whatever the problem, so
  // fixing one never just reveals another. NaN is text in the input that isn't a number.
  it.each([0, 13, 6.5, NaN])("rejects a width of %j (a whole number of columns, 1 to 12)", (width) => {
    expect(issues({ contact: [{ name: "first", width }], misc: [] })).toEqual({ "contact.0.width": "Must be a whole number from 1 to 12" });
  });

  it("rejects a width that isn't a number", () => {
    expect(issues({ contact: [{ name: "first", width: "6" }], misc: [] })).toHaveProperty(["contact.0.width"]);
  });

  it.each([0, 1.5, NaN])("rejects %j rows (a whole number, at least 1)", (rows) => {
    expect(issues({ contact: [], misc: [{ name: "comments", rows }] })).toEqual({ "misc.0.rows": "Must be a whole number, 1 or more" });
  });

  // The Fields page clears these to null. They parse to undefined, which the JSON column doesn't
  // store, so a cleared setting is saved as no setting at all.
  it("parses a null width or rows to no setting", () => {
    const result = fieldsConfigSchema.parse({ contact: [{ name: "first", width: null }], misc: [{ name: "comments", rows: null }] });
    expect(JSON.parse(JSON.stringify(result))).toStrictEqual({ contact: [{ name: "first" }], misc: [{ name: "comments" }] });
  });

  it("rejects malformed options", () => {
    expect(issues({ contact: [], misc: [{ name: "age", options: [{ label: "Adult" }] }] })).toHaveProperty(["misc.0.options.0.value"]);
  });
});
