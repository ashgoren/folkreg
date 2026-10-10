import { z } from "zod";
import { slugSchema } from "@repo/tenant-config";

// The General page's autosaved switches.
export const generalSchema = z.object({
  is_live: z.boolean(),
  show_preregistration: z.boolean(),
});
export type GeneralValues = z.infer<typeof generalSchema>;

// The subdomain, saved on its own and only when the organizer confirms: changing it moves the
// registration site, and the old address stops working.
export const slugValuesSchema = z.object({ slug: slugSchema });
