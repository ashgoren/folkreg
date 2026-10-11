import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTenant } from "@/test/fixtures";
import { expectLastSave, expectNoSave } from "@/test/autosave";
import { defaultRegistrationConfig } from "@repo/tenant-config";
import type { RegistrationConfig } from "@repo/tenant-config";

vi.mock("./actions", () => ({ updateRegistration: vi.fn() }));
import { updateRegistration } from "./actions";
import { RegistrationForm } from "./RegistrationForm";

const byId = (id: string) => document.getElementById(id) as HTMLInputElement;

const stored = (overrides: Partial<RegistrationConfig> = {}): RegistrationConfig => ({ ...defaultRegistrationConfig(), ...overrides });

// The page is rendered at noon Pacific on October 20, 2026; a new tenant's event is on Pacific time.
const NOW = Date.parse("2026-10-20T19:00Z");
const renderForm = (config: RegistrationConfig = stored()) => {
  const tenant = makeTenant({ registration_config: config });
  render(<RegistrationForm tenant={tenant} now={NOW} />);
  return tenant;
};

// The one-line summary at the top of the page.
const summary = () => document.querySelector("form > p");

const setDate = (id: string, value: string) => {
  fireEvent.change(byId(id), { target: { value } });
  fireEvent.blur(byId(id));
};

describe("RegistrationForm", () => {
  beforeEach(() => {
    vi.mocked(updateRegistration).mockReset().mockResolvedValue(null);
  });

  it("starts a new tenant open, paying right away, with no times or limits", () => {
    renderForm();
    expect(screen.getByRole("switch", { name: "Open" })).toBeChecked();
    expect(byId("registration-opens-at")).toHaveValue("");
    expect(byId("registration-closes-at")).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "Close after" })).not.toBeChecked();
    expect(byId("registration-close-after-people")).toHaveValue(100);
    expect(screen.getByRole("radio", { name: "Pay right away" })).toBeChecked();
    expect(summary()).toHaveTextContent("Open now · registrants pay right away");
  });

  it("populates a stored lottery config and summarizes it on the event's clock", () => {
    renderForm(stored({
      opensAt: "2026-11-01T12:00",
      closesAt: "2026-11-15T12:00",
      mode: "lottery",
      lotteryResultsDate: "2026-11-20",
    }));
    expect(byId("registration-opens-at")).toHaveValue("2026-11-01T12:00");
    expect(byId("registration-lottery-results")).toHaveValue("2026-11-20");
    expect(screen.getByRole("radio", { name: "Enter the lottery" })).toBeChecked();
    expect(summary()).toHaveTextContent(
      "Opens November 1, 2026 at 12:00 PM PST · closes November 15, 2026 at 12:00 PM PST · registrants enter the lottery",
    );
  });

  it("summarizes a closing time that has passed", () => {
    renderForm(stored({ closesAt: "2026-10-15T12:00" }));
    expect(summary()).toHaveTextContent("Closed since October 15, 2026 at 12:00 PM PDT");
  });

  // The admin can't count orders, so a people limit is described rather than checked.
  it("describes the people limits", () => {
    renderForm(stored({ closeAfter: { enabled: true, people: 400 }, waitlistAfter: { enabled: true, people: 240 } }));
    expect(summary()).toHaveTextContent("Open now · closes after 400 people · registrants pay right away · waitlisted after 240 people");
  });

  it("closes registration with the switch, saving and summarizing it", async () => {
    const tenant = renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("switch", { name: "Open" }));

    expect(summary()).toHaveTextContent("Closed (turned off)");
    await expectLastSave(vi.mocked(updateRegistration), tenant.id, stored({ open: false }));
  });

  describe("opening and closing times", () => {
    it("save as the event's own clock time", async () => {
      const tenant = renderForm();
      setDate("registration-opens-at", "2026-11-01T12:00");
      setDate("registration-closes-at", "2026-11-15T12:00");
      await expectLastSave(vi.mocked(updateRegistration), tenant.id, stored({ opensAt: "2026-11-01T12:00", closesAt: "2026-11-15T12:00" }));
    });

    // Blank is a setting of its own: no opening or closing time.
    it("clear with their Clear buttons, which only show while there's a time", async () => {
      const tenant = renderForm(stored({ opensAt: "2026-11-01T12:00" }));
      const user = userEvent.setup();
      expect(screen.queryByRole("button", { name: "Clear Closes" })).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Clear Opens" }));

      expect(byId("registration-opens-at")).toHaveValue("");
      expect(screen.queryByRole("button", { name: "Clear Opens" })).not.toBeInTheDocument();
      await expectLastSave(vi.mocked(updateRegistration), tenant.id, stored());
    });

    it("flags a closing time before the opening time, without saving or summarizing it", async () => {
      renderForm(stored({ opensAt: "2026-11-15T12:00" }));
      setDate("registration-closes-at", "2026-11-01T12:00");

      expect(await screen.findByText("Must be after the opening time")).toBeInTheDocument();
      expect(summary()).toHaveTextContent("Fix the settings below to see when registration is open.");
      await expectNoSave(vi.mocked(updateRegistration));
    });
  });

  describe("people limits", () => {
    it("turn on with their checkbox", async () => {
      const tenant = renderForm();
      const user = userEvent.setup();

      await user.click(screen.getByRole("checkbox", { name: "Close after" }));

      await expectLastSave(vi.mocked(updateRegistration), tenant.id, stored({ closeAfter: { enabled: true, people: 100 } }));
    });

    // The number shows whether or not its limit is on, so its error is never hidden.
    it("flag a cleared number while off, without saving", async () => {
      renderForm();
      const user = userEvent.setup();

      await user.clear(byId("registration-waitlist-after-people"));
      await user.tab();

      expect(await screen.findByText("Must be a whole number, 1 or more")).toBeInTheDocument();
      await expectNoSave(vi.mocked(updateRegistration));
    });

    it("warn when the waitlist limit is never reached before closing", () => {
      renderForm(stored({ closeAfter: { enabled: true, people: 200 }, waitlistAfter: { enabled: true, people: 240 } }));
      expect(screen.getByText(/before anyone reaches the waitlist/)).toBeInTheDocument();
    });

    it("don't warn outside pay mode, where the waitlist limit doesn't apply", () => {
      renderForm(stored({ mode: "lottery", closeAfter: { enabled: true, people: 200 }, waitlistAfter: { enabled: true, people: 240 } }));
      expect(screen.queryByText(/before anyone reaches the waitlist/)).not.toBeInTheDocument();
    });
  });

  // Switching modes only changes which values apply.
  it("switches mode, keeping the other modes' values", async () => {
    const config = stored({ lotteryResultsDate: "2026-11-20", waitlistAfter: { enabled: true, people: 240 } });
    const tenant = renderForm(config);
    const user = userEvent.setup();

    await user.click(screen.getByRole("radio", { name: "Join the waitlist" }));

    expect(summary()).toHaveTextContent("registrants join the waitlist");
    await expectLastSave(vi.mocked(updateRegistration), tenant.id, { ...config, mode: "waitlist" });
  });
});
