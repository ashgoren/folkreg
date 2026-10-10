// Covers SpreadsheetForm together with SpreadsheetFieldRow. Drag-reordering columns is covered
// by the Playwright e2e suite -- dnd-kit's pointer/geometry handling doesn't run in jsdom.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { defaultPaymentsConfig } from "@repo/tenant-config";
import { makeTenant } from "@/test/fixtures";
import { expectLastSave } from "@/test/autosave";
import type { FieldName } from "@repo/fields";
import type { FieldsConfig, PaymentsConfig } from "@repo/tenant-config";

vi.mock("./actions", () => ({ updateSpreadsheet: vi.fn() }));
import { updateSpreadsheet } from "./actions";
import { SpreadsheetForm } from "./SpreadsheetForm";

// Active fields by name, with no settings: the Spreadsheet page only reads which fields are active.
const fields = (contact: FieldName[], misc: FieldName[] = []): FieldsConfig => ({
  contact: contact.map((name) => ({ name })),
  misc: misc.map((name) => ({ name })),
});

// Registrant columns are the draggable rows -- each has a drag handle -- in on-screen order.
const registrantColumns = () =>
  screen.getAllByRole("button", { name: "Drag to reorder" }).map((handle) => handle.parentElement!.textContent);

// System columns render after the registrant rows as fixed, non-interactive rows ending in "key".
const systemColumns = () => Array.from(screen.getByText("key", { exact: true }).parentElement!.children).map((el) => el.textContent);

const paymentsConfig = (overrides: Partial<PaymentsConfig>): PaymentsConfig => ({ ...defaultPaymentsConfig(), ...overrides });

const ALWAYS_SYSTEM_COLUMNS = ["admission", "total", "paid", "charged", "status", "purchaser", "completedAt", "paymentId", "paymentEmail", "environment", "key"];

describe("SpreadsheetForm", () => {
  beforeEach(() => {
    vi.mocked(updateSpreadsheet).mockReset().mockResolvedValue(null);
  });

  describe("registrant columns", () => {
    it("explains that there's nothing to order until fields are activated", () => {
      render(<SpreadsheetForm tenant={makeTenant({ fields_config: fields([]) })} />);
      expect(screen.getByText(/No active fields yet/)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Drag to reorder" })).not.toBeInTheDocument();
    });

    it("derives columns from active fields: contact then misc, skipping excluded fields and adding follow-up columns", () => {
      render(<SpreadsheetForm tenant={makeTenant({ fields_config: fields(["first", "email", "emailConfirmation"], ["misc", "photo"]) })} />);
      // emailConfirmation is excludeFromSpreadsheet; misc and photo each add their follow-up's
      // storageKey right after themselves.
      expect(registrantColumns()).toEqual(["first", "email", "misc", "miscComments", "photo", "photoComments"]);
      expect(screen.getAllByRole("button", { name: "Hide column" })).toHaveLength(6);
    });

    it("keeps stored order and visibility, drops columns no longer active, and appends new ones as visible", () => {
      const tenant = makeTenant({
        fields_config: fields(["first", "email"], ["misc"]),
        spreadsheet_config: {
          sheetId: "abc",
          columns: [
            { name: "misc", visible: false },
            { name: "removedField", visible: true },
            { name: "first", visible: true },
          ],
        },
      });
      render(<SpreadsheetForm tenant={tenant} />);

      expect(registrantColumns()).toEqual(["misc", "first", "email", "miscComments"]);
      expect(screen.getByText("misc")).toHaveClass("line-through");
      expect(screen.getAllByRole("button", { name: "Show column" })).toHaveLength(1);
      expect(screen.getByLabelText("Spreadsheet URL or ID")).toHaveValue("abc");
    });
  });

  describe("system columns", () => {
    it("lists only the always-relevant system columns when no optional features are on", () => {
      render(<SpreadsheetForm tenant={makeTenant()} />);
      expect(systemColumns()).toEqual(ALWAYS_SYSTEM_COLUMNS);
    });

    it("adds waiver/deposit/donation/fees columns when those features are enabled, in canonical order", () => {
      render(
        <SpreadsheetForm
          tenant={makeTenant({
            waiver_config: { show: true, docusealTemplateId: "" },
            payments_config: paymentsConfig({ coverFees: { enabled: true, percent: 2.9, fixed: 0.3 }, deposit: { enabled: true, amount: 25 }, donation: { enabled: true, max: 100 } }),
          })}
        />,
      );
      expect(systemColumns()).toEqual([
        "admission", "donation", "total", "deposit", "fees", "paid", "charged",
        "status", "purchaser", "completedAt", "paymentId", "paymentEmail",
        "waiver", "environment", "key",
      ]);
    });

    it("isn't hideable or draggable", () => {
      render(<SpreadsheetForm tenant={makeTenant({ fields_config: fields(["first"]) })} />);
      const status = screen.getByText("status", { exact: true });
      expect(status.querySelector("button")).toBeNull();
    });
  });

  describe("autosave", () => {
    it("saves a visibility toggle with the full column list", async () => {
      const tenant = makeTenant({ fields_config: fields(["first", "email"]) });
      const user = userEvent.setup();
      render(<SpreadsheetForm tenant={tenant} />);

      await user.click(screen.getAllByRole("button", { name: "Hide column" })[1]!);

      expect(screen.getByText("email")).toHaveClass("line-through");
      await expectLastSave(vi.mocked(updateSpreadsheet), tenant.id, {
        sheetId: "",
        columns: [{ name: "first", visible: true }, { name: "email", visible: false }],
      });

      await user.click(screen.getByRole("button", { name: "Show column" }));
      await expectLastSave(vi.mocked(updateSpreadsheet), tenant.id, {
        sheetId: "",
        columns: [{ name: "first", visible: true }, { name: "email", visible: true }],
      });
    });

    it("saves a pasted sheet URL exactly as entered, without extracting the ID", async () => {
      const tenant = makeTenant({ fields_config: fields(["first"]) });
      const user = userEvent.setup();
      render(<SpreadsheetForm tenant={tenant} />);

      const url = "https://docs.google.com/spreadsheets/d/1AbC_dEf-123/edit#gid=0";
      await user.type(screen.getByLabelText("Spreadsheet URL or ID"), url);
      await user.tab();
      await expectLastSave(vi.mocked(updateSpreadsheet), tenant.id, { sheetId: url, columns: [{ name: "first", visible: true }] });
    });
  });
});
