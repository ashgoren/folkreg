// Covers AdmissionsForm together with the per-mode subforms it renders (SlidingScaleFields,
// FixedFields, TieredFields -> TieredCategories -> TieredCategoryCard), since those only exist
// as pieces of this form's state. Drag-reordering tiered categories is covered by the
// Playwright e2e suite -- dnd-kit's pointer/geometry handling doesn't run in jsdom.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTenant } from "@/test/fixtures";
import { expectLastSave, expectNoSave } from "@/test/autosave";
import type { AdmissionsConfig } from "@repo/types";

vi.mock("./actions", () => ({ updateAdmissions: vi.fn() }));
import { updateAdmissions } from "./actions";
import { AdmissionsForm } from "./AdmissionsForm";

const byId = (id: string) => document.getElementById(id) as HTMLInputElement;

const SHARED_DEFAULTS = { admissionQuantityMax: 4, waitlistCutoff: 999, forceWaitlist: false };

const replace = async (user: ReturnType<typeof userEvent.setup>, id: string, text: string) => {
  await user.clear(byId(id));
  await user.type(byId(id), text);
};

describe("AdmissionsForm", () => {
  beforeEach(() => {
    vi.mocked(updateAdmissions).mockReset().mockResolvedValue(null);
  });

  describe("initial state", () => {
    it("defaults a new tenant to sliding scale with the standard range and shared defaults", () => {
      render(<AdmissionsForm tenant={makeTenant()} />);
      expect(screen.getByRole("radio", { name: "Sliding scale" })).toBeChecked();
      expect(byId("admissions-cost-min")).toHaveValue(20);
      expect(byId("admissions-cost-max")).toHaveValue(100);
      expect(byId("admissions-cost-default")).toHaveValue(60);
      expect(byId("admissions-quantity-max")).toHaveValue(4);
      expect(byId("admissions-waitlist-cutoff")).toHaveValue(999);
      expect(screen.getByRole("switch", { name: /Force waitlist/ })).not.toBeChecked();
    });

    it("populates a stored fixed config", () => {
      const config: AdmissionsConfig = { mode: "fixed", cost: 45, admissionQuantityMax: 2, waitlistCutoff: 150, forceWaitlist: true };
      render(<AdmissionsForm tenant={makeTenant({ admissions_config: config })} />);
      expect(screen.getByRole("radio", { name: "Fixed" })).toBeChecked();
      expect(byId("admissions-fixed-cost")).toHaveValue(45);
      expect(byId("admissions-cost-min")).toBeNull();
      expect(byId("admissions-quantity-max")).toHaveValue(2);
      expect(screen.getByRole("switch", { name: /Force waitlist/ })).toBeChecked();
    });

    it("populates a stored tiered config, one card per category", () => {
      const config: AdmissionsConfig = {
        mode: "tiered",
        earlybirdCutoff: "2027-01-15",
        categories: [
          { label: "Basic", ageGroups: ["adult"], early: 80, later: 100 },
          { label: "Youth", ageGroups: ["6-12", "13-17"], early: 40, later: 50 },
        ],
        ...SHARED_DEFAULTS,
      };
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

      await replace(user, "admissions-cost-default", "80");
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, {
        mode: "sliding-scale", costRange: [20, 100], costDefault: 80, ...SHARED_DEFAULTS,
      });
    });

    it("rejects a default outside the min/max range", async () => {
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={makeTenant()} />);

      await replace(user, "admissions-cost-default", "150");
      await user.tab();

      expect(screen.getByRole("alert")).toHaveTextContent("Must be between minimum and maximum");
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
    it("resets to the new mode's defaults but carries the shared fields across", async () => {
      const tenant = makeTenant();
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      await replace(user, "admissions-quantity-max", "6");
      await user.click(screen.getByRole("switch", { name: /Force waitlist/ }));
      await user.click(screen.getByRole("radio", { name: "Fixed" }));

      expect(byId("admissions-fixed-cost")).toHaveValue(60);
      expect(byId("admissions-cost-min")).toBeNull();
      expect(byId("admissions-quantity-max")).toHaveValue(6);
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, {
        mode: "fixed", cost: 60, admissionQuantityMax: 6, waitlistCutoff: 999, forceWaitlist: true,
      });
    });

    it("restores a mode's earlier edits when switching back to it in the same session", async () => {
      const tenant = makeTenant();
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      await replace(user, "admissions-cost-default", "70");
      await user.click(screen.getByRole("radio", { name: "Fixed" }));
      await replace(user, "admissions-fixed-cost", "55");
      await user.click(screen.getByRole("radio", { name: "Sliding scale" }));
      expect(byId("admissions-cost-default")).toHaveValue(70);

      await user.click(screen.getByRole("radio", { name: "Fixed" }));
      expect(byId("admissions-fixed-cost")).toHaveValue(55);
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, expect.objectContaining({ mode: "fixed", cost: 55 }));
    });

    it("carries shared-field edits made in another mode into a restored mode", async () => {
      const tenant = makeTenant();
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={tenant} />);

      await user.click(screen.getByRole("radio", { name: "Fixed" }));
      await replace(user, "admissions-waitlist-cutoff", "200");
      await user.click(screen.getByRole("radio", { name: "Sliding scale" }));

      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, {
        mode: "sliding-scale", costRange: [20, 100], costDefault: 60, admissionQuantityMax: 4, waitlistCutoff: 200, forceWaitlist: false,
      });
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
        mode: "tiered",
        earlybirdCutoff: "2027-01-15",
        categories: [{ label: "Basic", ageGroups: ["adult", "13-17"], early: 80, later: 100 }],
        ...SHARED_DEFAULTS,
      });

      await user.click(screen.getByRole("checkbox", { name: "Adult" }));
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, expect.objectContaining({
        categories: [{ label: "Basic", ageGroups: ["13-17"], early: 80, later: 100 }],
      }));

      await user.click(screen.getByRole("button", { name: "Remove category" }));
      await expectLastSave(vi.mocked(updateAdmissions), tenant.id, expect.objectContaining({ mode: "tiered", categories: [] }));
    });

    it("removes the right category from the middle of the list", async () => {
      const config: AdmissionsConfig = {
        mode: "tiered",
        earlybirdCutoff: "",
        categories: [
          { label: "A", ageGroups: [], early: 1, later: 1 },
          { label: "B", ageGroups: [], early: 2, later: 2 },
          { label: "C", ageGroups: [], early: 3, later: 3 },
        ],
        ...SHARED_DEFAULTS,
      };
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
      const config: AdmissionsConfig = {
        mode: "tiered", earlybirdCutoff: "", categories: [{ label: "A", ageGroups: [], early: 1, later: 1 }], ...SHARED_DEFAULTS,
      };
      const user = userEvent.setup();
      render(<AdmissionsForm tenant={makeTenant({ admissions_config: config })} />);

      await user.clear(byId("admissions-category-early-0"));
      await user.tab();

      expect(screen.getByRole("alert")).toHaveTextContent("Required");
      await expectNoSave(vi.mocked(updateAdmissions));
    });
  });
});
