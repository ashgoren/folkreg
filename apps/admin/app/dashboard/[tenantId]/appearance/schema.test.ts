import { describe, it, expect } from "vitest";
import { defaultThemeConfig } from "@repo/tenant-config";
import { appearanceSchema, type AppearanceValues } from "./schema";

const valid: AppearanceValues = {
  backgroundLight: "#ffffff",
  backgroundDark: "#000000",
  foregroundLight: "#1A1A1A",
  foregroundDark: "#EEEEEE",
  accentLight: "#d97706",
  accentDark: "#F59E0B",
};

describe("appearanceSchema", () => {
  it("accepts six-digit hex colors in either case", () => {
    expect(appearanceSchema.safeParse(valid).success).toBe(true);
  });

  it.each([
    ["a three-digit shorthand", "#fff"],
    ["a missing #", "ffffff"],
    ["an eight-digit color with alpha", "#ffffff80"],
    ["a non-hex digit", "#gggggg"],
    ["a named color", "red"],
    ["a blank value", ""],
  ])("rejects %s", (_, color) => {
    const result = appearanceSchema.safeParse({ ...valid, accentLight: color });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["accentLight"]);
    expect(result.error?.issues[0]?.message).toBe("Must be a hex color, e.g. #d97706");
  });

  it("accepts the @repo/tenant-config default theme", () => {
    expect(appearanceSchema.safeParse(defaultThemeConfig()).success).toBe(true);
  });
});
