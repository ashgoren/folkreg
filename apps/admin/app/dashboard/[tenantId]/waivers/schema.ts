import { z } from "zod";

export const waiversSchema = z.object({
  show: z.boolean(),
  docusealTemplateId: z.string().optional(),
  docuseal_key: z.string().optional(),
});

export type WaiversValues = z.infer<typeof waiversSchema>;
