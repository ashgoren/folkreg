import { z } from "zod";

export const generalSchema = z.object({
  slug: z.string().min(1, "Required").regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only"),
  is_live: z.boolean(),
  show_preregistration: z.boolean(),
});

export type GeneralValues = z.infer<typeof generalSchema>;
