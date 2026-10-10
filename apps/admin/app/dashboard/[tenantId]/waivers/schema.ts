import { z } from "zod";
import { waiverConfigSchema } from "@repo/tenant-config";

// The DocuSeal API key, which lives in tenant_secrets and is saved by its own action
// (updateWaiverSecrets). Blank is "" here, null in the table.
export const waiverSecretsSchema = z.object({
  docuseal_key: z.string(),
});
export type WaiverSecretsValues = z.infer<typeof waiverSecretsSchema>;

// What the Waivers form edits: waiver_config and the key together.
export const waiversSchema = waiverConfigSchema.extend(waiverSecretsSchema.shape);
export type WaiversValues = z.infer<typeof waiversSchema>;
