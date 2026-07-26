import { z } from "zod";

export const spreadsheetSchema = z.object({
  // Accepts either a bare sheet ID or a full Google Sheets URL, stored as-is --
  // whatever reads this to call the Sheets API is responsible for extracting the ID,
  // e.g. via `trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? trimmed`.
  sheetId: z.string(),
  columns: z.array(z.object({
    name: z.string(),
    visible: z.boolean(),
  })),
});

export type SpreadsheetValues = z.infer<typeof spreadsheetSchema>;
