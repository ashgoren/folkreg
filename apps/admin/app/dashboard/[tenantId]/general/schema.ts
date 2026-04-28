import { z } from "zod";

export const generalSchema = z.object({
  slug: z.string().min(1, "Required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  domain: z.string().optional(),
  is_live: z.boolean(),
  waitlistCutoff: z.number().int().min(1, "Must be at least 1 if filled in").nullable(),
  showPreregistration: z.boolean(),
});

export type GeneralValues = z.infer<typeof generalSchema>;
