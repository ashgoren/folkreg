import { z } from "zod";

const fieldConfigSchema = z.object({
  title: z.string().optional(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
  defaultValue: z.string().optional(),
  rows: z.number().optional(),
  width: z.number().optional(),
  required: z.boolean().optional(),
});

export const fieldsSchema = z.object({
  contactOrder: z.array(z.string()),
  miscOrder: z.array(z.string()),
  config: z.record(z.string(), fieldConfigSchema),
});

export type FieldsValues = z.infer<typeof fieldsSchema>;
