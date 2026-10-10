import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTenant } from "@/test/fixtures";
import { expectLastSave, expectNoSave } from "@/test/autosave";

vi.mock("./actions", () => ({ updateGeneral: vi.fn(), updateSlug: vi.fn() }));
import { updateGeneral } from "./actions";
import { GeneralForm } from "./GeneralForm";

describe("GeneralForm", () => {
  beforeEach(() => {
    vi.mocked(updateGeneral).mockReset().mockResolvedValue(null);
  });

  it("populates from the tenant", () => {
    render(<GeneralForm tenant={makeTenant({ slug: "spring-dance", is_live: true, show_preregistration: true })} />);
    expect(screen.getByText("spring-dance.folkreg.org")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: /Live mode/ })).toBeChecked();
    expect(screen.getByRole("switch", { name: /Show preregistration/ })).toBeChecked();
  });

  // The subdomain isn't part of the autosaved values; SlugSetting saves it on its own.
  it("autosaves the switches, without the subdomain", async () => {
    const tenant = makeTenant({ slug: "spring-dance" });
    const user = userEvent.setup();
    render(<GeneralForm tenant={tenant} />);

    await user.click(screen.getByRole("switch", { name: /Show preregistration/ }));
    await expectLastSave(vi.mocked(updateGeneral), tenant.id, { is_live: false, show_preregistration: true });
  });

  // Opening or closing registration is immediately public, so the switch asks first.
  describe("live mode", () => {
    it("goes live only once confirmed, then labels it live", async () => {
      const tenant = makeTenant({ slug: "spring-dance", is_live: false });
      const user = userEvent.setup();
      render(<GeneralForm tenant={tenant} />);
      expect(screen.getByText("SANDBOX")).toBeInTheDocument();
      expect(screen.getByText("closed")).toBeInTheDocument();

      await user.click(screen.getByRole("switch", { name: /Live mode/ }));
      const dialog = screen.getByRole("alertdialog", { name: "Open registration to the public?" });
      expect(dialog).toHaveTextContent("spring-dance.folkreg.org will take real registrations and payments.");
      // The modal hides the page behind it from assistive tech, so the switch is found as hidden.
      expect(screen.getByRole("switch", { name: /Live mode/, hidden: true })).not.toBeChecked();

      await user.click(screen.getByRole("button", { name: "Go live" }));
      expect(screen.getByRole("switch", { name: /Live mode/ })).toBeChecked();
      expect(screen.getByText("LIVE")).toBeInTheDocument();
      expect(screen.getByText("open")).toBeInTheDocument();
      await expectLastSave(vi.mocked(updateGeneral), tenant.id, expect.objectContaining({ is_live: true }));
    });

    it("changes nothing when cancelled", async () => {
      const user = userEvent.setup();
      render(<GeneralForm tenant={makeTenant({ is_live: false })} />);

      await user.click(screen.getByRole("switch", { name: /Live mode/ }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.getByRole("switch", { name: /Live mode/ })).not.toBeChecked();
      await expectNoSave(vi.mocked(updateGeneral));
    });

    it("asks before closing registration too", async () => {
      const tenant = makeTenant({ is_live: true });
      const user = userEvent.setup();
      render(<GeneralForm tenant={tenant} />);

      await user.click(screen.getByRole("switch", { name: /Live mode/ }));
      expect(screen.getByRole("alertdialog", { name: "Close registration?" })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Close registration" }));
      await expectLastSave(vi.mocked(updateGeneral), tenant.id, expect.objectContaining({ is_live: false }));
    });
  });
});
