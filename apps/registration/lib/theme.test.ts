import { describe, expect, it } from "vitest";
import { dataThemeAttribute, nextTheme, parseTheme } from "./theme";

describe("parseTheme", () => {
  it("reads an explicit choice", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
  });

  it("treats a missing or unrecognized value as auto", () => {
    expect(parseTheme(undefined)).toBe("auto");
    expect(parseTheme("")).toBe("auto");
    expect(parseTheme("auto")).toBe("auto");
    expect(parseTheme("DARK")).toBe("auto");
  });
});

describe("nextTheme", () => {
  it("steps auto, light, dark, and back to auto", () => {
    expect(nextTheme("auto")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("auto");
  });
});

describe("dataThemeAttribute", () => {
  it("is the explicit choice, or nothing for auto", () => {
    expect(dataThemeAttribute("light")).toBe("light");
    expect(dataThemeAttribute("dark")).toBe("dark");
    expect(dataThemeAttribute("auto")).toBeUndefined();
  });
});
