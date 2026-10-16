import { describe, expect, it } from "vitest";
import { defaultThemeConfig } from "@repo/tenant-config";
import { readableTextOn, tenantThemeStyle } from "./tenant-theme";

describe("readableTextOn", () => {
  it("puts white text on a dark or saturated accent", () => {
    expect(readableTextOn("#000000")).toBe("#ffffff");
    expect(readableTextOn("#2563eb")).toBe("#ffffff"); // the default blue
    expect(readableTextOn("#1b5e20")).toBe("#ffffff"); // dark green
  });

  it("puts near-black text on a light or bright accent", () => {
    expect(readableTextOn("#ffffff")).toBe("#0a0a0a");
    expect(readableTextOn("#fbbf24")).toBe("#0a0a0a"); // amber
    expect(readableTextOn("#f1a039")).toBe("#0a0a0a"); // orange
  });
});

describe("tenantThemeStyle", () => {
  it("supplies both modes' colors, with readable text on each accent", () => {
    const style = tenantThemeStyle({
      ...defaultThemeConfig(),
      backgroundLight: "#fae1b7",
      accentLight: "#cc7a00",
      backgroundDark: "#2a1500",
      accentDark: "#f1a039",
    });

    expect(style).toMatchObject({
      "--tenant-background-light": "#fae1b7",
      "--tenant-accent-light": "#cc7a00",
      "--tenant-background-dark": "#2a1500",
      "--tenant-accent-dark": "#f1a039",
      "--tenant-accent-foreground-dark": "#0a0a0a",
    });
    expect(style).toHaveProperty("--tenant-foreground-light");
    expect(style).toHaveProperty("--tenant-foreground-dark");
    expect(style).toHaveProperty("--tenant-accent-foreground-light");
  });

  it("adds a header color and readable text on it only for a mode whose header is set", () => {
    const style = tenantThemeStyle({ ...defaultThemeConfig(), headerLight: "", headerDark: "#1b5e20" });

    expect(style).not.toHaveProperty("--tenant-header-light");
    expect(style).not.toHaveProperty("--tenant-header-foreground-light");
    expect(style).toMatchObject({
      "--tenant-header-dark": "#1b5e20",
      "--tenant-header-foreground-dark": "#ffffff",
    });
  });
});
