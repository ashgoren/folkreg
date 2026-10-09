import { z } from "zod";

export const waiversSchema = z.object({
  show: z.boolean(),
  docusealTemplateId: z.string(),
  docuseal_key: z.string(),
});

export type WaiversValues = z.infer<typeof waiversSchema>;
