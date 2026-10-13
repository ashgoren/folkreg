import { z } from "zod";

// Schema-building helper for a whole number with min & optional max (intentionally duplicated in @repo/tenant-config)
const wholeNumber = ({ min, max }: { min: number; max?: number }, error: string) => {
  const number = z.number({ error }).int({ error }).min(min, { error });
  return max === undefined ? number : number.max(max, { error });
};

// The settings an organizer can customize about one field. This is the one definition of that,
// shape, used for two things that must always agree on it: a catalog field's own `defaults`
// (what FieldDef.defaults holds, which is the starting values a tenant gets when activating the field)
// and @repo/tenant-config's ActiveField (the tenant's current values for those same settings, plus
// which catalog field it is). There's fundamentally one set of organizer-editable settings,
// not two shapes that happen to match. Keys are optional because not every setting applies to
// every field.
export const fieldDefaultsSchema = z.object({
  title: z.string().optional(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  defaultValue: z.union([z.string(), z.array(z.string())]).optional(),
  rows: wholeNumber({ min: 1 }, "Must be a whole number, 1 or more").nullable().optional(),
  width: wholeNumber({ min: 1, max: 12 }, "Must be a whole number from 1 to 12"),
  required: z.boolean().optional(),
  includeOnNametag: z.boolean().optional(), // offered to organizer as option for pronouns & last name fields
  firstPersonOptions: z.array(z.string()).optional(), // age options can be limited for first person
});

export type FieldDefaults = z.infer<typeof fieldDefaultsSchema>;
