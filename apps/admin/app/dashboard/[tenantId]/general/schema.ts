import { z } from "zod";
import { slugSchema } from "@repo/tenant-config";

export const generalSchema = z.object({
  slug: slugSchema,
  is_live: z.boolean(),
  show_preregistration: z.boolean(),
});

export type GeneralValues = z.infer<typeof generalSchema>;
