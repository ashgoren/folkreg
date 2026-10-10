import { describe, it, expect } from "vitest";
import { defaultTenantConfig } from "./defaults";
import { resolveSpreadsheetColumns } from "./spreadsheet-columns";
import type { FieldsConfig, TenantConfig } from "./schemas";

const config = (overrides: Partial<TenantConfig> = {}): TenantConfig => ({ ...defaultTenantConfig(), ...overrides });
const fields = (contact: FieldsConfig["contact"], misc: FieldsConfig["misc"] = []): FieldsConfig => ({ contact, misc });
const names = (columns: { name: string }[]) => columns.map((column) => column.name);

describe("resolveSpreadsheetColumns", () => {
  describe("registrant columns", () => {
    // Contact then misc; email confirmation is excluded (it repeats email), and a follow-up gets
    // its own column right after its field.
    it("are the active fields, with follow-ups and without excluded fields", () => {
      const { registrant } = resolveSpreadsheetColumns(config({
        fields_config: fields([{ name: "first" }, { name: "email" }, { name: "emailConfirmation" }], [{ name: "photo" }, { name: "comments" }]),
      }));
      expect(names(registrant)).toEqual(["first", "email", "photo", "photoComments", "comments"]);
      expect(registrant.every((column) => column.visible)).toBe(true);
    });

    // A new tenant stores no columns, so every available one shows.
    it("start all visible, in field order, when none are stored", () => {
      const { registrant } = resolveSpreadsheetColumns(config());
      expect(registrant.length).toBeGreaterThan(0);
      expect(registrant.every((column) => column.visible)).toBe(true);
    });

    it("keep the stored order and hidden columns", () => {
      const { registrant } = resolveSpreadsheetColumns(config({
        fields_config: fields([{ name: "first" }, { name: "last" }, { name: "email" }]),
        spreadsheet_config: { sheetId: "", columns: [{ name: "email", visible: true }, { name: "first", visible: false }, { name: "last", visible: true }] },
      }));
      expect(registrant).toEqual([{ name: "email", visible: true }, { name: "first", visible: false }, { name: "last", visible: true }]);
    });

    // Stored columns go stale when the Fields page changes without a Spreadsheet edit.
    it("drop columns whose fields are no longer active, and append newly active ones as visible", () => {
      const { registrant } = resolveSpreadsheetColumns(config({
        fields_config: fields([{ name: "first" }, { name: "phone" }]),
        spreadsheet_config: { sheetId: "", columns: [{ name: "email", visible: false }, { name: "first", visible: false }] },
      }));
      expect(registrant).toEqual([{ name: "first", visible: false }, { name: "phone", visible: true }]);
    });
  });

  describe("system columns", () => {
    const ALWAYS = ["admission", "total", "paid", "charged", "status", "purchaser", "completedAt", "paymentId", "paymentEmail", "isLive", "key"];

    it("are the always-relevant ones when no optional feature is on, ending with key", () => {
      expect(resolveSpreadsheetColumns(config()).system).toEqual(ALWAYS);
    });

    it("include waiver, deposit, donation, and fees while those features are on, in a fixed order", () => {
      const defaults = defaultTenantConfig();
      const { system } = resolveSpreadsheetColumns(config({
        waiver_config: { ...defaults.waiver_config, show: true },
        payments_config: {
          ...defaults.payments_config,
          deposit: { ...defaults.payments_config.deposit, enabled: true },
          donation: { ...defaults.payments_config.donation, enabled: true },
          coverFees: { ...defaults.payments_config.coverFees, enabled: true },
        },
      }));
      expect(system).toEqual([
        "admission", "donation", "total", "deposit", "fees", "paid", "charged",
        "status", "purchaser", "completedAt", "paymentId", "paymentEmail", "waiver", "isLive", "key",
      ]);
    });
  });
});
