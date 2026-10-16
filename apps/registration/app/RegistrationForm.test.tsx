import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FieldsConfig, WaiverConfig } from "@repo/tenant-config";
import type { Person } from "@repo/types";

vi.mock("./actions", () => ({ submitRegistration: vi.fn() }));
import { submitRegistration } from "./actions";
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

const renderForm = () => render(<RegistrationForm fieldsConfig={fieldsConfig} waiverConfig={waiverConfig} />);

// Fills the registrant's required fields and clicks Done, leaving it valid and in summary mode --
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
  await user.click(screen.getByRole("button", { name: "Done" }));
};

beforeEach(() => {
  window.sessionStorage.clear();
  vi.mocked(submitRegistration).mockResolvedValue({ error: "unused in most tests" } as never);
});

describe("RegistrationForm", () => {
  it("renders the registrant card open by default", () => {
    renderForm();
    expect(screen.getByLabelText("First name", { exact: false })).toBeInTheDocument();
  });

  it("resumes the draft saved earlier in this tab", () => {
    // first/last/email/emailConfirmation/phone are all required now (not just active), so each
    // needs a real value -- emailConfirmation also has to match email, since its crossValidation
    // runs unconditionally whenever it's active.
    const registrant = {
      first: "Jane", last: "Doe", email: "jane@example.com", emailConfirmation: "jane@example.com", phone: "555-555-5555", agreement: ["yes"],
    } as unknown as Person;
    window.sessionStorage.setItem("registration-draft", JSON.stringify({ party: { registrant, companions: [] } }));

    renderForm();

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

  it("clicking Done on an invalid card shows its errors and keeps it in edit mode", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Done" }));

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
    await user.click(screen.getByRole("button", { name: "Done" })); // Person 2 collapses; Edit buttons reappear

    await user.click(screen.getByRole("button", { name: "Edit Jane Doe" })); // the registrant's Edit button, labeled by its typed name

    expect(screen.getAllByLabelText("First name", { exact: false })).toHaveLength(1);
    expect(screen.getByRole("group", { name: "You" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Person 2" })).toBeInTheDocument();
  });

  describe("draft", () => {
    const savedDraft = () => JSON.parse(window.sessionStorage.getItem("registration-draft")!).party;

    // Saved locally, so there's no reason to wait for the field to lose focus.
    it("saves every keystroke to the tab's draft, without waiting for blur", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText("First name", { exact: false }), "Jane");

      expect(savedDraft().registrant.first).toBe("Jane");
    });

    it("saves a checkbox change to the tab's draft", async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(screen.getByRole("checkbox", { name: "Yes" }));

      expect(savedDraft().registrant.agreement).toEqual(["yes"]);
    });

    it("starts blank when the stored draft isn't usable", () => {
      window.sessionStorage.setItem("registration-draft", "not json");

      renderForm();

      expect(screen.getByLabelText("First name", { exact: false })).toHaveValue("");
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
