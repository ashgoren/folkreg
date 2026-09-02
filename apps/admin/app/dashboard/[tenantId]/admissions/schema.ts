import { z } from "zod";

const ageGroup = z.enum(["0-2", "3-5", "6-12", "13-17", "adult"]);

const requiredNumber = (min: number) => z.number({ error: "Required" }).min(min);

const sharedFields = {
  admissionQuantityMax: requiredNumber(1).int(),
  waitlistCutoff: requiredNumber(1).int(),
  forceWaitlist: z.boolean(),
};

export const admissionsSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("sliding-scale"),
    costRange: z.tuple([requiredNumber(0), requiredNumber(0)]),
    costDefault: requiredNumber(0),
    ...sharedFields,
  }).refine((data) => data.costDefault >= data.costRange[0] && data.costDefault <= data.costRange[1], {
    message: "Must be between minimum and maximum",
    path: ["costDefault"],
  }),
  z.object({
    mode: z.literal("fixed"),
    cost: requiredNumber(0),
    ...sharedFields,
  }),
  z.object({
    mode: z.literal("tiered"),
    earlybirdCutoff: z.string(),
    categories: z.array(z.object({
      label: z.string(),
      ageGroups: z.array(ageGroup),
      early: requiredNumber(0),
      later: requiredNumber(0),
    })),
    ...sharedFields,
  }),
]);

export type AdmissionsValues = z.infer<typeof admissionsSchema>;
