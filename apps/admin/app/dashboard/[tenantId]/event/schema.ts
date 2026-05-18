import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().min(1, "Required"),
  year: z.number().int().min(2000).max(2100),
  location: z.string().min(1, "Required"),
  date: z.string().min(1, "Required"),
  timezone: z.string().min(1, "Required"),
  calendar: z.object({
    title: z.string(),
    description: z.string(),
    location: z.string(),
    start: z.string(),
    end: z.string(),
  }),
  contacts: z.object({
    info: z.string().min(1, "Required").email("Must be a valid email"),
    housing: z.string(),
  }),
  links: z.object({
    info: z.string(),
    health: z.string(),
    safety: z.string(),
  }),
  nametags: z.object({
    includePronouns: z.boolean(),
    includeLastName: z.boolean(),
  }),
});

export type EventValues = z.infer<typeof eventSchema>;
