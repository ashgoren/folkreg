import { z } from "zod";

const optionalEmail = z.union([z.literal(""), z.string().email("Must be a valid email")]);

export const receiptsSchema = z.object({
  emailFrom: optionalEmail,
  emailReplyTo: optionalEmail,
});

export type ReceiptsValues = z.infer<typeof receiptsSchema>;
