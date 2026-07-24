import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-f]{6}$/i, "Must be a hex color, e.g. #d97706");

export const appearanceSchema = z.object({
  backgroundLight: hexColor,
  backgroundDark: hexColor,
  foregroundLight: hexColor,
  foregroundDark: hexColor,
  accentLight: hexColor,
  accentDark: hexColor,
});

export type AppearanceValues = z.infer<typeof appearanceSchema>;
