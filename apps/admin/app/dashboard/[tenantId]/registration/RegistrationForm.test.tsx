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

// Open now by default, so the summary reflects each test's times and limits rather than the opening.
const stored = (overrides: Partial<RegistrationConfig> = {}): RegistrationConfig => ({ ...defaultRegistrationConfig(), opening: "now", ...overrides });

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

  it("starts a new tenant closed, paying right away, with no closing time or limits", () => {
    renderForm(defaultRegistrationConfig());
    expect(screen.getByRole("radio", { name: "Closed" })).toBeChecked();
    expect(byId("registration-opens-at")).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "Close at" })).not.toBeChecked();
    expect(byId("registration-close-at-time")).toHaveValue("");
    expect(screen.getByRole("checkbox", { name: "Close after" })).not.toBeChecked();
    expect(byId("registration-close-after-people")).toHaveValue(100);
    expect(screen.getByRole("radio", { name: "Pay right away" })).toBeChecked();
    expect(summary()).toHaveTextContent("Closed");
  });

  it("populates a stored lottery config and summarizes it on the event's clock", () => {
    renderForm(stored({
      opening: "scheduled",
      opensAt: "2026-11-01T12:00",
      closeAt: { enabled: true, at: "2026-11-15T12:00" },
      mode: "lottery",
      lotteryResultsDate: "2026-11-20",
    }));
    expect(screen.getByRole("radio", { name: "Opens on" })).toBeChecked();
    expect(byId("registration-opens-at")).toHaveValue("2026-11-01T12:00");
    expect(screen.getByRole("checkbox", { name: "Close at" })).toBeChecked();
    expect(byId("registration-close-at-time")).toHaveValue("2026-11-15T12:00");
    expect(byId("registration-lottery-results")).toHaveValue("2026-11-20");
    expect(screen.getByRole("radio", { name: "Enter the lottery" })).toBeChecked();
    expect(summary()).toHaveTextContent(
      "Opens November 1, 2026 at 12:00 PM PST · closes November 15, 2026 at 12:00 PM PST · registrants enter the lottery",
    );
  });

  it("summarizes a closing time that has passed", () => {
    renderForm(stored({ closeAt: { enabled: true, at: "2026-10-15T12:00" } }));
    expect(summary()).toHaveTextContent("Closed since October 15, 2026 at 12:00 PM PDT");
  });

  // The admin can't count orders, so a people limit is described rather than checked.
  it("describes the people limits", () => {
    renderForm(stored({ closeAfter: { enabled: true, people: 400 }, waitlistAfter: { enabled: true, people: 240 } }));
    expect(summary()).toHaveTextContent("Open now · closes after 400 people · registrants pay right away · waitlisted after 240 people");
  });

  describe("opening", () => {
    const SCHEDULED = { opening: "scheduled", opensAt: "2026-11-01T12:00" } as const;

    // Any choice that could make the site public sooner asks first, saying when.
    it.each([
      ["closed", "Open now", { opening: "closed" }, ""],
      ["closed", "Opens on", { ...SCHEDULED, opening: "closed" }, " starting November 1, 2026 at 12:00 PM PST"],
      ["scheduled", "Open now", SCHEDULED, ""],
      ["closed without a time", "Opens on", { opening: "closed", opensAt: "" }, " starting at the opening time you set"],
    ] as const)("asks before going from %s to %s, saving nothing until confirmed", async (_, choice, config, startingAt) => {
      const tenant = renderForm(stored(config));
      const user = userEvent.setup();

      await user.click(screen.getByRole("radio", { name: choice }));

      expect(screen.getByRole("alertdialog", { name: "Open registration?" }))
        .toHaveTextContent(`${tenant.slug}.folkreg.org will take registrations from the public${startingAt}.`);
      // The modal dialog hides the page behind it from the accessibility tree, hence `hidden`.
      expect(screen.getByRole("radio", { name: choice, hidden: true })).not.toBeChecked();
      await expectNoSave(vi.mocked(updateRegistration));
    });

    // Closing, or scheduling while open now, only narrows when registrations are taken.
    it.each([
      ["now", "Closed", stored(), "closed"],
      ["now", "Opens on", stored({ opensAt: "2026-11-01T12:00" }), "scheduled"],
      ["scheduled", "Closed", stored(SCHEDULED), "closed"],
    ] as const)("goes from %s to %s without asking", async (_, choice, config, opening) => {
      const tenant = renderForm(config);
      const user = userEvent.setup();

      await user.click(screen.getByRole("radio", { name: choice }));

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      await expectLastSave(vi.mocked(updateRegistration), tenant.id, { ...config, opening });
    });

    it("stays closed when cancelled", async () => {
      renderForm(defaultRegistrationConfig());
      const user = userEvent.setup();

      await user.click(screen.getByRole("radio", { name: "Open now" }));
      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.getByRole("radio", { name: "Closed" })).toBeChecked();
      await expectNoSave(vi.mocked(updateRegistration));
    });

    it("opens once confirmed, saving and summarizing it", async () => {
      const tenant = renderForm(defaultRegistrationConfig());
      const user = userEvent.setup();

      await user.click(screen.getByRole("radio", { name: "Open now" }));
      await user.click(screen.getByRole("button", { name: "Open registration" }));

      expect(screen.getByRole("radio", { name: "Open now" })).toBeChecked();
      expect(summary()).toHaveTextContent("Open now · registrants pay right away");
      await expectLastSave(vi.mocked(updateRegistration), tenant.id, stored());
    });

    // Its time shows beside it, so the error is where it's fixed.
    it("requires a time once scheduled, without saving until there is one", async () => {
      const tenant = renderForm(stored());
      const user = userEvent.setup();

      await user.click(screen.getByRole("radio", { name: "Opens on" }));
      expect(await screen.findByText("Required")).toBeInTheDocument();
      await expectNoSave(vi.mocked(updateRegistration));

      setDate("registration-opens-at", "2026-11-01T12:00");
      await expectLastSave(vi.mocked(updateRegistration), tenant.id, stored(SCHEDULED));
    });
  });

  describe("closing time", () => {
    it("turns on with its checkbox, requiring a time, and saves as the event's own clock time", async () => {
      const tenant = renderForm();
      const user = userEvent.setup();

      await user.click(screen.getByRole("checkbox", { name: "Close at" }));
      expect(await screen.findByText("Required")).toBeInTheDocument();
      await expectNoSave(vi.mocked(updateRegistration));

      setDate("registration-close-at-time", "2026-11-15T12:00");
      await expectLastSave(vi.mocked(updateRegistration), tenant.id, stored({ closeAt: { enabled: true, at: "2026-11-15T12:00" } }));
    });

    it("keeps its time when turned off", async () => {
      const tenant = renderForm(stored({ closeAt: { enabled: true, at: "2026-11-15T12:00" } }));
      const user = userEvent.setup();

      await user.click(screen.getByRole("checkbox", { name: "Close at" }));

      expect(byId("registration-close-at-time")).toHaveValue("2026-11-15T12:00");
      expect(summary()).not.toHaveTextContent("closes");
      await expectLastSave(vi.mocked(updateRegistration), tenant.id, stored({ closeAt: { enabled: false, at: "2026-11-15T12:00" } }));
    });

    it("flags a time before a scheduled opening, without saving or summarizing it", async () => {
      renderForm(stored({ opening: "scheduled", opensAt: "2026-11-15T12:00", closeAt: { enabled: true, at: "2026-11-20T12:00" } }));
      setDate("registration-close-at-time", "2026-11-01T12:00");

      expect(await screen.findByText("Must be after the opening time")).toBeInTheDocument();
      expect(summary()).toHaveTextContent("Fix the settings below to see when registration is open.");
      await expectNoSave(vi.mocked(updateRegistration));
    });

    // Only times that both apply are compared, so a kept one can't block saving anything else.
    it("doesn't block saving while it's off, whatever its time", async () => {
      const config = stored({ opening: "scheduled", opensAt: "2026-11-15T12:00", closeAt: { enabled: false, at: "2026-11-01T12:00" } });
      const tenant = renderForm(config);
      const user = userEvent.setup();

      await user.click(screen.getByRole("switch", { name: "Show preregistration?" }));

      await expectLastSave(vi.mocked(updateRegistration), tenant.id, { ...config, showPreregistration: true });
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

  it("saves the preregistration switch", async () => {
    const tenant = renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("switch", { name: "Show preregistration?" }));

    await expectLastSave(vi.mocked(updateRegistration), tenant.id, stored({ showPreregistration: true }));
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
