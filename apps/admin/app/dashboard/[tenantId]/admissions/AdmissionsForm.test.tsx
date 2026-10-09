// Covers AdmissionsForm together with the per-mode subforms it renders (SlidingScaleFields,
// FixedFields, TieredFields -> TieredCategories -> TieredCategoryCard), since those only exist
// as pieces of this form's state. Drag-reordering tiered categories is covered by the
// Playwright e2e suite -- dnd-kit's pointer/geometry handling doesn't run in jsdom.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTenant } from "@/test/fixtures";
import { expectLastSave, expectNoSave } from "@/test/autosave";
import { defaultAdmissionsConfig } from "@repo/tenant-config";
import type { AdmissionsConfig } from "@repo/tenant-config";

vi.mock("./actions", () => ({ updateAdmissions: vi.fn() }));
import { updateAdmissions } from "./actions";
import { AdmissionsForm } from "./AdmissionsForm";

const byId = (id: string) => document.getElementById(id) as HTMLInputElement;

// A new tenant's config -- and so the base of what any edit to it saves, since every mode's values
// are part of it.
const DEFAULTS = defaultAdmissionsConfig();
const stored = (overrides: Partial<AdmissionsConfig>): AdmissionsConfig => ({ ...defaultAdmissionsConfig(), ...overrides });

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

    it("populates a stored tiered config, one card per category", () => {
      const config = stored({
        mode: "tiered",
        earlybirdCutoff: "2027-01-15",
        categories: [
          { label: "Basic", ageGroups: ["adult"], early: 80, later: 100 },
          { label: "Youth", ageGroups: ["6-12", "13-17"], early: 40, later: 50 },
        ],
      });
      render(<AdmissionsForm tenant={makeTenant({ admissions_config: config })} />);

      expect(byId("admissions-earlybird-cutoff")).toHaveValue("2027-01-15");
      expect(byId("admissions-category-label-0")).toHaveValue("Basic");
      expect(byId("admissions-category-later-1")).toHaveValue(50);
      expect(screen.getAllByRole("button", { name: "Remove category" })).toHaveLength(2);

      // Age groups render as checkboxes per card; the second card has 6-12 and 13-17 checked.
      const youthCard = byId("admissions-category-label-1").closest(".rounded.border") as HTMLElement;
      expect(within(youthCard).getByRole("checkbox", { name: "6-12 yr old" })).toBeChecked();
      expect(within(youthCard).getByRole("checkbox", { name: "13-17 yr old" })).toBeChecked();
      expect(within(youthCard).getByRole("checkbox", { name: "Adult" })).not.toBeChecked();
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
    it("starts with no categories, and adds/fills/removes them", async () => {
      const tenant = makeTenant();
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      await user.click(screen.getByRole("radio", { name: "Tiered" }));
      expect(screen.queryByRole("button", { name: "Remove category" })).not.toBeInTheDocument();

      await user.type(byId("admissions-earlybird-cutoff"), "2027-01-15");
      await user.click(screen.getByRole("button", { name: /Add category/ }));
      await user.type(byId("admissions-category-label-0"), "Basic");
      await replace(user, "admissions-category-early-0", "80");
      await replace(user, "admissions-category-later-0", "100");
      await user.click(screen.getByRole("checkbox", { name: "Adult" }));
      await user.click(screen.getByRole("checkbox", { name: "13-17 yr old" }));

      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, {
        ...DEFAULTS,
        mode: "tiered",
        earlybirdCutoff: "2027-01-15",
        categories: [{ label: "Basic", ageGroups: ["adult", "13-17"], early: 80, later: 100 }],
      });

      await user.click(screen.getByRole("checkbox", { name: "Adult" }));
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, expect.objectContaining({
        categories: [{ label: "Basic", ageGroups: ["13-17"], early: 80, later: 100 }],
      }));

      await user.click(screen.getByRole("button", { name: "Remove category" }));
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, expect.objectContaining({ mode: "tiered", categories: [] }));
    });

    it("removes the right category from the middle of the list", async () => {
      const config = stored({
        mode: "tiered",
        categories: [
          { label: "A", ageGroups: [], early: 1, later: 1 },
          { label: "B", ageGroups: [], early: 2, later: 2 },
          { label: "C", ageGroups: [], early: 3, later: 3 },
        ],
      });
      const tenant = makeTenant({ admissions_config: config });
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      await user.click(screen.getAllByRole("button", { name: "Remove category" })[1]!);

      expect(byId("admissions-category-label-0")).toHaveValue("A");
      expect(byId("admissions-category-label-1")).toHaveValue("C");
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, expect.objectContaining({
        categories: [config.categories[0], config.categories[2]],
      }));
    });

    it("flags a cleared category price and doesn't save it", async () => {
      const config = stored({ mode: "tiered", categories: [{ label: "A", ageGroups: [], early: 1, later: 1 }] });
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={makeTenant({ admissions_config: config })} />);

      await user.clear(byId("admissions-category-early-0"));
      await user.tab();

      expect(screen.getByRole("alert")).toHaveTextContent("Required");
      await expectNoSave(vi.mocked(updateAdmissions));
    });
  });
});
