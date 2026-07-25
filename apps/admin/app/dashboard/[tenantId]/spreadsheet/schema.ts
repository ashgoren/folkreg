import { z } from "zod";

export const spreadsheetSchema = z.object({
  // Accepts either a bare sheet ID or a full Google Sheets URL and normalizes to just the ID
  sheetId: z.string().transform((value) => {
    const trimmed = value.trim();
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match?.[1] ?? trimmed;
  }),
  columns: z.array(z.object({
    name: z.string(),
    visible: z.boolean(),
  })),
});

export type SpreadsheetValues = z.infer<typeof spreadsheetSchema>;
