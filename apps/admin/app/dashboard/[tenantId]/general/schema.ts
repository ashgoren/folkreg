import { z } from "zod";

export const generalSchema = z.object({
  domain: z.string().optional(),
  is_live: z.boolean(),
  waitlistEnabled: z.boolean(),
  waitlistCutoff: z.number().int().min(1, "Must be at least 1").nullable(),
  showPreregistration: z.boolean(),
}).refine(
  data => !data.waitlistEnabled || data.waitlistCutoff !== null,
  { message: "Capacity is required when waitlist is enabled", path: ["waitlistCutoff"] }
);

export type GeneralValues = z.infer<typeof generalSchema>;
