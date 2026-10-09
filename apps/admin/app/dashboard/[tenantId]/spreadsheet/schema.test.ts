import { describe, it, expect } from "vitest";
import { spreadsheetSchema } from "./schema";

describe("spreadsheetSchema", () => {
  it("accepts a bare ID and a column list", () => {
    const value = { sheetId: "1AbC_dEf-123", columns: [{ name: "first", visible: true }, { name: "email", visible: false }] };
    expect(spreadsheetSchema.safeParse(value).success).toBe(true);
  });

  // sheetId is stored exactly as entered (no transform) -- whatever calls the Sheets API
  // extracts the bare ID at the point of use. Asserting the parsed output equals the input
  // pins that down: a future .transform() here would change it and fail this test.
  it("passes a full Google Sheets URL through unchanged", () => {
    const sheetId = "https://docs.google.com/spreadsheets/d/1AbC_dEf-123/edit#gid=0";
    const result = spreadsheetSchema.safeParse({ sheetId, columns: [] });
    expect(result.success).toBe(true);
    expect(result.data?.sheetId).toBe(sheetId);
  });

  it("accepts a blank sheet ID and no columns", () => {
    expect(spreadsheetSchema.safeParse({ sheetId: "", columns: [] }).success).toBe(true);
  });

  it("requires each column to have a name and a visibility flag", () => {
    expect(spreadsheetSchema.safeParse({ sheetId: "", columns: [{ name: "first" }] }).success).toBe(false);
    expect(spreadsheetSchema.safeParse({ sheetId: "", columns: [{ visible: true }] }).success).toBe(false);
  });
});
