import { z } from "zod";
import { waiverConfigSchema } from "@repo/tenant-config";

// waiver_config plus the DocuSeal API key, which the same form edits but which lives in
// tenant_secrets.
export const waiversSchema = waiverConfigSchema.extend({
  docuseal_key: z.string(),
});

export type WaiversValues = z.infer<typeof waiversSchema>;
