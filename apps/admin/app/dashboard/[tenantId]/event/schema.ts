import { z } from "zod";

export const eventSchema = z.object({
  title: z.string(),
  year: z.number().int().min(2000).max(2100),
  location: z.string(),
  date: z.string(),
  timezone: z.string(),
  calendar: z.object({
    title: z.string(),
    description: z.string(),
    location: z.string(),
    start: z.string(),
    end: z.string(),
  }),
  contacts: z.object({
    info: z.union([z.literal(""), z.string().email("Must be a valid email")]),
    housing: z.string(),
  }),
  links: z.object({
    info: z.string(),
    health: z.string(),
    safety: z.string(),
  }),
});

export type EventValues = z.infer<typeof eventSchema>;
