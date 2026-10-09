import { z } from "zod";

const ageGroup = z.enum(["0-2", "3-5", "6-12", "13-17", "adult"]);

const requiredNumber = (min: number) => z.number({ error: "Required" }).min(min);

// One flat shape holding every pricing mode's values; `mode` picks which one applies. All of them
// are validated whichever mode is active -- the form only lets an organizer switch modes while the
// current one is valid, and a hidden mode's fields can't be edited, so they stay valid.
export const admissionsSchema = z.object({
  mode: z.enum(["sliding-scale", "fixed", "tiered"]),
  costRange: z.tuple([requiredNumber(0), requiredNumber(0)]),
  costDefault: requiredNumber(0),
  cost: requiredNumber(0),
  earlybirdCutoff: z.string(),
  categories: z.array(z.object({
    label: z.string(),
    ageGroups: z.array(ageGroup),
    early: requiredNumber(0),
    later: requiredNumber(0),
  })),
  admissionQuantityMax: requiredNumber(1).int(),
  waitlistCutoff: requiredNumber(1).int(),
  forceWaitlist: z.boolean(),
}).refine((data) => data.costDefault >= data.costRange[0] && data.costDefault <= data.costRange[1], {
  message: "Must be between minimum and maximum",
  path: ["costDefault"],
});

export type AdmissionsValues = z.infer<typeof admissionsSchema>;
