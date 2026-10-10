// Covers AdmissionsForm together with the per-mode subforms it renders (SlidingScaleFields,
// FixedFields, TieredFields -> TieredCategories -> TieredCategoryCard), since those only exist
// as pieces of this form's state. Drag-reordering tiered prices isn't covered here: dnd-kit's
// pointer/geometry handling doesn't run in jsdom (see the skipped test in e2e/admissions.spec.ts).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTenant } from "@/test/fixtures";
import { expectLastSave, expectNoSave } from "@/test/autosave";
import { defaultAdmissionsConfig, defaultFieldEntry, defaultFieldsConfig } from "@repo/tenant-config";
import type { AdmissionsConfig, FieldEntry } from "@repo/tenant-config";

vi.mock("./actions", () => ({ updateAdmissions: vi.fn() }));
import { updateAdmissions } from "./actions";
import { AdmissionsForm } from "./AdmissionsForm";

const byId = (id: string) => document.getElementById(id) as HTMLInputElement;

// A new tenant's config -- and so the base of what any edit to it saves, since every mode's values
// are part of it.
const DEFAULTS = defaultAdmissionsConfig();
const stored = (overrides: Partial<AdmissionsConfig>): AdmissionsConfig => ({ ...defaultAdmissionsConfig(), ...overrides });

// A tenant with the age field active, whose options are the age groups tiered pricing prices by:
// the catalog's own options unless given others.
const withAge = (options?: FieldEntry["options"]) => {
  const fields = defaultFieldsConfig();
  fields.misc.push({ ...defaultFieldEntry("age"), ...(options && { options }) });
  return { fields_config: fields };
};

// Tiered prices are a section per age group, titled with the age option's label; the nth price's
// inputs are named after its section and position.
const ageSection = (title: string) => within(screen.getByRole("region", { name: title }));
const priceAmount = (title: string, n: number) => screen.getByRole("spinbutton", { name: `${title} price ${n} amount` });
const priceLabel = (title: string, n: number) => screen.getByRole("textbox", { name: `${title} price ${n} label` });
const afterCutoff = (title: string) =>
  [...screen.getByRole("region", { name: title }).querySelectorAll("[data-after-cutoff]")].map((cell) => cell.textContent);

const replace = async (user: ReturnType<typeof userEvent.setup>, id: string, text: string) => {
  await user.clear(byId(id));
  await user.type(byId(id), text);
};

describe("AdmissionsForm", () => {
  beforeEach(() => {
    vi.mocked(updateAdmissions).mockReset().mockResolvedValue(null);
  });

  describe("initial state", () => {
    it("starts a new tenant on sliding scale with the default range and shared settings", () => {
      render(<AdmissionsForm tenant={makeTenant()} />);
      expect(screen.getByRole("radio", { name: "Sliding scale" })).toBeChecked();
      expect(byId("admissions-cost-min")).toHaveValue(120);
      expect(byId("admissions-cost-max")).toHaveValue(500);
      expect(byId("admissions-cost-default")).toHaveValue(350);
      expect(byId("admissions-quantity-max")).toHaveValue(4);
      expect(byId("admissions-waitlist-cutoff")).toHaveValue(999);
      expect(screen.getByRole("switch", { name: /Force waitlist/ })).not.toBeChecked();
    });

    it("populates a stored fixed config", () => {
      const config = stored({ mode: "fixed", cost: 45, admissionQuantityMax: 2, waitlistCutoff: 150, forceWaitlist: true });
      render(<AdmissionsForm tenant={makeTenant({ admissions_config: config })} />);
      expect(screen.getByRole("radio", { name: "Fixed" })).toBeChecked();
      expect(byId("admissions-fixed-cost")).toHaveValue(45);
      expect(byId("admissions-cost-min")).toBeNull();
      expect(byId("admissions-quantity-max")).toHaveValue(2);
      expect(screen.getByRole("switch", { name: /Force waitlist/ })).toBeChecked();
    });

    it("populates a stored tiered config, a section per age group", () => {
      const config = stored({
        mode: "tiered",
        earlybirdCutoff: "2027-01-15",
        lateIncrease: 10,
        prices: [{ ageGroup: "adult", options: [{ label: "Basic", price: 80 }, { label: "Supporter", price: 120 }] }],
      });
      render(<AdmissionsForm tenant={makeTenant({ admissions_config: config, ...withAge() })} />);

      expect(byId("admissions-earlybird-cutoff")).toHaveValue("2027-01-15");
      expect(byId("admissions-late-increase")).toHaveValue(10);
      expect(priceLabel("Adult", 2)).toHaveValue("Supporter");
      expect(priceAmount("Adult", 2)).toHaveValue(120);
      expect(afterCutoff("Adult")).toEqual(["$90 after cutoff", "$130 after cutoff"]);
      expect(ageSection("6-12 yr old").getByText(/No price yet/)).toBeInTheDocument();
    });
  });

  describe("sliding scale", () => {
    it("autosaves the range and default as numbers", async () => {
      const tenant = makeTenant();
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      await replace(user, "admissions-cost-default", "300");
      await user.tab();
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, { ...DEFAULTS, costDefault: 300 });
    });

    it("rejects a default outside the min/max range", async () => {
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={makeTenant()} />);

      await replace(user, "admissions-cost-default", "600");
      await user.tab();

      expect(screen.getByRole("alert")).toHaveTextContent("Must be between minimum and maximum");
      await expectNoSave(vi.mocked(updateAdmissions));
    });

    // Typing "400" passes through "4" and "40", both valid minimums (at most the 350 default).
    // Only the value left in the field when it's blurred may be saved, never one of those.
    it("never saves an intermediate value typed on the way to an invalid one", async () => {
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={makeTenant()} />);

      await replace(user, "admissions-cost-min", "400");
      await user.tab();

      await expectNoSave(vi.mocked(updateAdmissions));
    });

    // The range rule's error belongs to the default field, which this edit never touches. Saving
    // is blocked either way, so the error has to show anyway, or nothing on screen explains why.
    it("shows the default's range error when raising the minimum above it", async () => {
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={makeTenant()} />);

      await replace(user, "admissions-cost-min", "400");
      await user.tab();

      expect(await screen.findByText("Must be between minimum and maximum")).toBeInTheDocument();
      await expectNoSave(vi.mocked(updateAdmissions));
    });
  });

  describe("shared fields", () => {
    it("requires a max ticket quantity", async () => {
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={makeTenant()} />);

      await user.clear(byId("admissions-quantity-max"));
      await user.tab();

      expect(screen.getByRole("alert")).toHaveTextContent("Required");
      await expectNoSave(vi.mocked(updateAdmissions));
    });

    it("autosaves the force-waitlist toggle", async () => {
      const tenant = makeTenant();
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      await user.click(screen.getByRole("switch", { name: /Force waitlist/ }));
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, expect.objectContaining({ forceWaitlist: true }));
    });
  });

  describe("switching modes", () => {
    // Only `mode` changes: each mode's values stay in the form and in the save, so an accidental
    // switch loses nothing.
    it("shows the new mode's values and saves the change, keeping everything else", async () => {
      const tenant = makeTenant();
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      await replace(user, "admissions-quantity-max", "6");
      await user.click(screen.getByRole("switch", { name: /Force waitlist/ }));
      await user.click(screen.getByRole("radio", { name: "Fixed" }));

      expect(byId("admissions-fixed-cost")).toHaveValue(200);
      expect(byId("admissions-cost-min")).toBeNull();
      expect(byId("admissions-quantity-max")).toHaveValue(6);
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, {
        ...DEFAULTS, mode: "fixed", admissionQuantityMax: 6, forceWaitlist: true,
      });
    });

    it("shows each mode's earlier edits when switching back", async () => {
      const tenant = makeTenant();
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      await replace(user, "admissions-cost-default", "300");
      await user.click(screen.getByRole("radio", { name: "Fixed" }));
      await replace(user, "admissions-fixed-cost", "55");
      await user.click(screen.getByRole("radio", { name: "Sliding scale" }));
      expect(byId("admissions-cost-default")).toHaveValue(300);

      await user.click(screen.getByRole("radio", { name: "Fixed" }));
      expect(byId("admissions-fixed-cost")).toHaveValue(55);
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, { ...DEFAULTS, mode: "fixed", cost: 55, costDefault: 300 });
    });

    // Switching would hide the invalid field while its error still blocked every save, with
    // nothing on screen to explain why -- so the switch waits for the error to be fixed.
    it("stays on the current mode while it has an error", async () => {
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={makeTenant()} />);

      await user.clear(byId("admissions-cost-default"));
      await user.click(screen.getByRole("radio", { name: "Fixed" }));

      expect(screen.getByRole("radio", { name: "Sliding scale" })).toBeChecked();
      expect(byId("admissions-fixed-cost")).toBeNull();
      expect(screen.getByRole("alert")).toHaveTextContent("Required");
      await expectNoSave(vi.mocked(updateAdmissions));
    });
  });

  describe("tiered", () => {
    const tiered = (overrides: Partial<AdmissionsConfig> = {}) => stored({ mode: "tiered", ...overrides });

    // A typical event's prices, by the age groups the age field starts with.
    it("starts a new tenant with the default prices, by age group", async () => {
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={makeTenant(withAge())} />);
      await user.click(screen.getByRole("radio", { name: "Tiered" }));

      expect(screen.getAllByRole("region").map((region) => region.getAttribute("aria-label")))
        .toEqual(["Adult", "13-17 yr old", "6-12 yr old", "3-5 yr old", "0-2 yr old"]);
      expect(priceLabel("Adult", 1)).toHaveValue("Benefactor");
      expect(afterCutoff("Adult")).toEqual(["$355 after cutoff", "$295 after cutoff", "$235 after cutoff"]);
      // An unlabeled price, and a free one, which stays free.
      expect(priceLabel("6-12 yr old", 1)).toHaveValue("");
      expect(afterCutoff("0-2 yr old")).toEqual(["free"]);
    });

    it("saves an edited price, showing what it becomes after the cutoff", async () => {
      const tenant = makeTenant({ admissions_config: tiered(), ...withAge() });
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      await user.clear(priceAmount("Adult", 1));
      await user.type(priceAmount("Adult", 1), "350");
      expect(afterCutoff("Adult")[0]).toBe("$365 after cutoff");
      await user.tab();

      const [adult, ...rest] = DEFAULTS.prices;
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, expect.objectContaining({
        prices: [{ ...adult, options: [{ label: "Benefactor", price: 350 }, ...adult!.options.slice(1)] }, ...rest],
      }));
    });

    it("applies a new late increase to every price but a free one", async () => {
      const tenant = makeTenant({ admissions_config: tiered(), ...withAge() });
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      await replace(user, "admissions-late-increase", "20");
      expect(afterCutoff("Adult")).toEqual(["$360 after cutoff", "$300 after cutoff", "$240 after cutoff"]);
      expect(afterCutoff("0-2 yr old")).toEqual(["free"]);
      await user.tab();
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, expect.objectContaining({ lateIncrease: 20 }));
    });

    it("adds and removes prices within an age group", async () => {
      const prices = [{ ageGroup: "adult", options: [{ label: "Basic", price: 80 }] }];
      const tenant = makeTenant({ admissions_config: tiered({ prices }), ...withAge() });
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      await user.click(screen.getByRole("button", { name: "Add a price for Adult" }));
      await user.type(priceLabel("Adult", 2), "Student");
      await user.clear(priceAmount("Adult", 2));
      await user.type(priceAmount("Adult", 2), "50");
      await user.tab();
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, expect.objectContaining({
        prices: [{ ageGroup: "adult", options: [{ label: "Basic", price: 80 }, { label: "Student", price: 50 }] }],
      }));

      await user.click(screen.getByRole("button", { name: "Remove Adult price 1" }));
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, expect.objectContaining({
        prices: [{ ageGroup: "adult", options: [{ label: "Student", price: 50 }] }],
      }));
    });

    // A tenant's age brackets are its own: whatever options its age field has.
    it("gives each of the age field's options a section, adding its first price", async () => {
      const tenant = makeTenant({
        admissions_config: tiered({ prices: [] }),
        ...withAge([{ label: "Under 30", value: "under-30" }, { label: "30 and over", value: "30-plus" }]),
      });
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      expect(ageSection("Under 30").getByText(/No price yet/)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Add a price for 30 and over" }));
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, expect.objectContaining({
        prices: [{ ageGroup: "30-plus", options: [{ label: "", price: 0 }] }],
      }));
      expect(priceAmount("30 and over", 1)).toHaveValue(0);
    });

    // E.g. the option's value edited on the Fields page after it was priced.
    it("lists prices for an age group that's no longer an age option, so they can be removed", async () => {
      const prices = [
        { ageGroup: "adult", options: [{ label: "", price: 80 }] },
        { ageGroup: "teen", options: [{ label: "", price: 40 }] },
      ];
      const tenant = makeTenant({ admissions_config: tiered({ prices }), ...withAge() });
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      expect(priceAmount("teen (not an age option)", 1)).toHaveValue(40);
      await user.click(ageSection("teen (not an age option)").getByRole("button", { name: "Remove these prices" }));
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, expect.objectContaining({ prices: [prices[0]] }));
      expect(screen.queryByRole("region", { name: "teen (not an age option)" })).not.toBeInTheDocument();
      // The section below it, bound by position, still edits the right prices.
      expect(priceAmount("Adult", 1)).toHaveValue(80);
    });

    it("flags a cleared price and doesn't save it", async () => {
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={makeTenant({ admissions_config: tiered(), ...withAge() })} />);

      await user.clear(priceAmount("Adult", 1));
      await user.tab();

      expect(ageSection("Adult").getByText("Required")).toBeInTheDocument();
      await expectNoSave(vi.mocked(updateAdmissions));
    });

    it("says to add the age field when it isn't active", () => {
      render(<AdmissionsForm tenant={makeTenant({ admissions_config: tiered() })} />);
      expect(screen.getByText(/Add the age field on the Fields page/)).toBeInTheDocument();
      expect(screen.queryByRole("region")).not.toBeInTheDocument();
    });

    it("says to add options when the age field has none", () => {
      render(<AdmissionsForm tenant={makeTenant({ admissions_config: tiered(), ...withAge([]) })} />);
      expect(screen.getByText(/The age field has no options yet/)).toBeInTheDocument();
    });
  });
});
