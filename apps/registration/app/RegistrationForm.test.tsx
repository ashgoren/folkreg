import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FieldsConfig, WaiverConfig } from "@repo/tenant-config";
import type { Person } from "@repo/types";
import type { InitialOrder } from "./registration-party";

vi.mock("./actions", () => ({ saveDraft: vi.fn(), submitRegistration: vi.fn() }));
import { saveDraft, submitRegistration } from "./actions";
import { RegistrationForm } from "./RegistrationForm";

// first/last/email/emailConfirmation/phone can't be deactivated (REQUIRED_FIELD_NAMES) and are
// always required too, regardless of this fixture's own required settings (fieldsConfigSchema
// rejects storing otherwise, and person-schema.ts enforces it either way) -- every fixture needs
// all five active, and fillValidRegistrant fills all five.
const fieldsConfig: FieldsConfig = {
  contact: [
    { name: "first", label: "First name", width: 12, required: true },
    { name: "last", label: "Last name", width: 12, required: true },
    { name: "email", label: "Email", width: 12, required: true },
    { name: "emailConfirmation", label: "Confirm email", width: 12, required: true },
    { name: "phone", label: "Phone", width: 12, required: true },
  ],
  misc: [{ name: "agreement", label: "Agreement", width: 12, options: [{ label: "Yes", value: "yes" }], required: true }],
};
const waiverConfig: WaiverConfig = { show: false, docusealTemplateId: "" };

const renderForm = () => render(<RegistrationForm fieldsConfig={fieldsConfig} waiverConfig={waiverConfig} initialOrder={null} />);

// Fills the registrant's required fields and clicks Save, leaving it valid and in summary mode --
// Add Someone Else and Edit (on other people) are both hidden while a form is still open, so this
// is the realistic sequence for any test that needs to get past the registrant.
// "Email" and "Confirm email" need a query that distinguishes them, but exact:false (substring,
// case-insensitive) matches both, and exact:true fails both -- getByLabelText reads the <label>'s
// plain textContent, which includes the required asterisk span despite its aria-hidden (that only
// affects the accessible-name computation getByRole uses, not this). An anchored regex sidesteps
// both problems.
const fillValidRegistrant = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("First name", { exact: false }), "Jane");
  await user.type(screen.getByLabelText("Last name", { exact: false }), "Doe");
  await user.type(screen.getByLabelText(/^Email/), "jane@example.com");
  await user.type(screen.getByLabelText(/^Confirm email/), "jane@example.com");
  await user.type(screen.getByLabelText("Phone", { exact: false }), "555-555-5555");
  await user.click(screen.getByRole("checkbox", { name: "Yes" }));
  await user.click(screen.getByRole("button", { name: "Save" }));
};

beforeEach(() => {
  vi.mocked(saveDraft).mockResolvedValue({ updatedAt: "2026-01-01T00:00:00Z" });
  vi.mocked(submitRegistration).mockResolvedValue({ error: "unused in most tests" } as never);
});

describe("RegistrationForm", () => {
  it("renders the registrant card open by default", () => {
    renderForm();
    expect(screen.getByLabelText("First name", { exact: false })).toBeInTheDocument();
  });

  it("resumes a draft's registrant values when initialOrder is given", () => {
    const initialOrder: InitialOrder = {
      updatedAt: "2026-01-01T00:00:00Z",
      // first/last/email/emailConfirmation/phone are all required now (not just active), so each
      // needs a real value -- emailConfirmation also has to match email, since its crossValidation
      // runs unconditionally whenever it's active.
      registrant: {
        first: "Jane", last: "Doe", email: "jane@example.com", emailConfirmation: "jane@example.com", phone: "555-555-5555", agreement: ["yes"],
      } as unknown as Person,
      companions: [],
    };

    render(<RegistrationForm fieldsConfig={fieldsConfig} waiverConfig={waiverConfig} initialOrder={initialOrder} />);

    // The resumed registrant is already valid, so the card starts in summary mode, showing the
    // resumed name instead of "You" and no input fields -- proof the resumed values, not
    // buildDefaultPerson's blanks, seeded the form.
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByLabelText("First name", { exact: false })).not.toBeInTheDocument();
  });

  it("hides Add Someone Else while a form is open, showing a hint instead", () => {
    renderForm();

    expect(screen.queryByRole("button", { name: "Add someone else" })).not.toBeInTheDocument();
    expect(screen.getByText(/you.ll be able to add more people/i)).toBeInTheDocument();
  });

  it("adding a companion after the registrant is valid closes the registrant and opens the new companion", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillValidRegistrant(user);

    await user.click(screen.getByRole("button", { name: "Add someone else" }));

    expect(screen.getAllByLabelText("First name", { exact: false })).toHaveLength(1);
    expect(screen.getByRole("group", { name: "Person 2" })).toBeInTheDocument();
  });

  it("clicking Save on an invalid card shows its errors and keeps it in edit mode", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("First name", { exact: false })).toBeInTheDocument();
    expect(await screen.findByText("Please enter first name.")).toBeInTheDocument();
  });

  it("hides Edit on other people while someone is being edited", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillValidRegistrant(user); // registrant valid and in summary mode
    await user.click(screen.getByRole("button", { name: "Add someone else" })); // Person 2 opens

    expect(screen.queryByRole("button", { name: "Edit Jane Doe" })).not.toBeInTheDocument();
  });

  it("switching to editing a different person requires saving the current one first", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillValidRegistrant(user);
    await user.click(screen.getByRole("button", { name: "Add someone else" })); // Person 2 opens

    await user.type(screen.getByLabelText("First name", { exact: false }), "Bob");
    await user.type(screen.getByLabelText("Last name", { exact: false }), "Smith");
    await user.type(screen.getByLabelText(/^Email/), "bob@example.com");
    await user.type(screen.getByLabelText(/^Confirm email/), "bob@example.com");
    await user.type(screen.getByLabelText("Phone", { exact: false }), "555-555-5555");
    await user.click(screen.getByRole("button", { name: "Save" })); // Person 2 collapses; Edit buttons reappear

    await user.click(screen.getByRole("button", { name: "Edit Jane Doe" })); // the registrant's Edit button, labeled by its typed name

    expect(screen.getAllByLabelText("First name", { exact: false })).toHaveLength(1);
    expect(screen.getByRole("group", { name: "You" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Person 2" })).toBeInTheDocument();
  });

  describe("autosave", () => {
    it("doesn't save while a text field is still focused, even with a non-empty email", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/^Email/), "jane@example.com");

      expect(saveDraft).not.toHaveBeenCalled();
    });

    it("saves a draft once the registrant's email field is blurred with content", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/^Email/), "jane@example.com");
      await user.tab();

      expect(saveDraft).toHaveBeenCalledWith(null, expect.objectContaining({ registrant: expect.objectContaining({ email: "jane@example.com" }) }));
    });

    it("doesn't save a blurred field while the registrant's email is still empty", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText("First name", { exact: false }), "Jane");
      await user.tab();

      expect(saveDraft).not.toHaveBeenCalled();
    });

    // A checkbox/radio/select change is a complete gesture (unlike a keystroke mid-typing), so it
    // saves right away rather than waiting for the form to lose focus -- matching the admin app's
    // own autosave convention.
    it("saves immediately on a checkbox change, without waiting for blur", async () => {
      const user = userEvent.setup();
      renderForm();
      await user.type(screen.getByLabelText(/^Email/), "jane@example.com");
      await user.tab();
      await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
      vi.mocked(saveDraft).mockClear();

      await user.click(screen.getByRole("checkbox", { name: "Yes" }));

      await waitFor(() =>
        expect(saveDraft).toHaveBeenCalledWith(
          "2026-01-01T00:00:00Z",
          expect.objectContaining({ registrant: expect.objectContaining({ agreement: ["yes"] }) })
        )
      );
    });
  });

  describe("submit", () => {
    it("doesn't call submitRegistration when the registrant is still invalid", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(submitRegistration).not.toHaveBeenCalled();
      expect(await screen.findByText("Please enter first name.")).toBeInTheDocument();
    });

    it("shows a conflict notice rather than silently retrying", async () => {
      vi.mocked(submitRegistration).mockResolvedValue({ conflict: true });
      const user = userEvent.setup();
      renderForm();
      await fillValidRegistrant(user);

      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/updated in another tab/i);
    });

    it("shows the server's error message", async () => {
      vi.mocked(submitRegistration).mockResolvedValue({ error: "Registration is no longer open." });
      const user = userEvent.setup();
      renderForm();
      await fillValidRegistrant(user);

      await user.click(screen.getByRole("button", { name: "Continue" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Registration is no longer open.");
    });
  });

  it("doesn't render agreement for a companion", async () => {
    const user = userEvent.setup();
    renderForm();
    await fillValidRegistrant(user); // Add is refused while the registrant is still invalid

    await user.click(screen.getByRole("button", { name: "Add someone else" }));

    const companionCard = screen.getByRole("group", { name: "Person 2" });
    expect(within(companionCard).queryByRole("checkbox", { name: "Yes" })).not.toBeInTheDocument();
  });
});
