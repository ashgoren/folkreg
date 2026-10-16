import type { CSSProperties } from "react";
import type { ThemeConfig } from "@repo/tenant-config";

// The text colors offered on top of the tenant's accent (buttons, checked checkboxes), one of
// which is chosen per mode by contrast. Near-black rather than pure black, matching the default
// foreground.
const DARK_TEXT = "#0a0a0a";
const LIGHT_TEXT = "#ffffff";

// WCAG relative luminance of a #rrggbb color: 0 for black, 1 for white, weighted for how bright
// each channel looks. Colors come from theme_config, whose schema guarantees the #rrggbb form.
const relativeLuminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    // Undo the sRGB gamma curve, so the channels are linear light before they're weighted.
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// WCAG contrast ratio between two colors, from 1 (identical) to 21 (black on white).
const contrastRatio = (a: string, b: string) => {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
};

// The more readable of near-black or white on `background`. The organizer picks the accent but not
// the text on it, so an accent of any brightness still gets legible button labels.
export const readableTextOn = (background: string) =>
  contrastRatio(background, DARK_TEXT) >= contrastRatio(background, LIGHT_TEXT) ? DARK_TEXT : LIGHT_TEXT;

// A header color and the text on it, when one is set. An unset header ("") adds nothing, and
// globals.css falls back to tinting the background with the accent.
const headerVariables = (color: string, mode: "light" | "dark") =>
  color === "" ? {} : { [`--tenant-header-${mode}`]: color, [`--tenant-header-foreground-${mode}`]: readableTextOn(color) };

// The tenant's colors as CSS variables for <html style>. globals.css maps them onto the
// variables the components use, choosing the light or dark set there, so this only supplies
// values and knows nothing about which mode is showing.
export const tenantThemeStyle = (theme: ThemeConfig): CSSProperties =>
  ({
    "--tenant-background-light": theme.backgroundLight,
    "--tenant-foreground-light": theme.foregroundLight,
    "--tenant-accent-light": theme.accentLight,
    "--tenant-accent-foreground-light": readableTextOn(theme.accentLight),
    ...headerVariables(theme.headerLight, "light"),
    "--tenant-background-dark": theme.backgroundDark,
    "--tenant-foreground-dark": theme.foregroundDark,
    "--tenant-accent-dark": theme.accentDark,
    "--tenant-accent-foreground-dark": readableTextOn(theme.accentDark),
    ...headerVariables(theme.headerDark, "dark"),
  }) as CSSProperties;
