import { describe, expect, it } from "vitest";
import { normalizeHex } from "./normalize-hex";

describe("normalizeHex", () => {
  it("leaves a complete color alone", () => {
    expect(normalizeHex("#1b5e20")).toBe("#1b5e20");
  });

  it("trims surrounding spaces", () => {
    expect(normalizeHex("  #1b5e20 ")).toBe("#1b5e20");
  });

  it("adds a missing #", () => {
    expect(normalizeHex("1b5e20")).toBe("#1b5e20");
    expect(normalizeHex(" 1B5E20")).toBe("#1B5E20");
  });

  it("expands 3-digit shorthand, with or without the #", () => {
    expect(normalizeHex("#fff")).toBe("#ffffff");
    expect(normalizeHex("a1c")).toBe("#aa11cc");
  });

  it("leaves anything it can't fix for the schema to report", () => {
    expect(normalizeHex("red")).toBe("red");
    expect(normalizeHex("#12345")).toBe("#12345");
    expect(normalizeHex("12345")).toBe("12345");
  });

  it("keeps a blank value blank", () => {
    expect(normalizeHex("   ")).toBe("");
  });
});
