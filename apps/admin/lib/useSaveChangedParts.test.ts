import { describe, it, expect } from "vitest";
import { z } from "zod";
import { pickKeys } from "./useSaveChangedParts";

describe("pickKeys", () => {
  const schema = z.object({ b: z.string(), a: z.string().transform((value) => `${value}!`) });

  it("keeps only the schema's keys, in the schema's order", () => {
    expect(JSON.stringify(pickKeys(schema, { a: "x", secret: "s", b: "y" }))).toBe('{"b":"y","a":"x"}');
  });

  // The values are the form's already-parsed output; a second parse would transform them again.
  it("doesn't run the schema's transforms", () => {
    expect(pickKeys(schema, { a: "x!", b: "y" }).a).toBe("x!");
  });
});
