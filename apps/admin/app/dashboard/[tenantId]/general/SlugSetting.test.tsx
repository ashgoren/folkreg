// The subdomain doesn't autosave: Change, then Save, then a confirmation that the site moves.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("./actions", () => ({ updateSlug: vi.fn() }));
import { updateSlug } from "./actions";
import { SlugSetting } from "./SlugSetting";

const TENANT_ID = "11111111-1111-4111-8111-111111111111";

const renderSetting = (slug = "spring-dance") => {
  const onSaved = vi.fn();
  render(<SlugSetting tenantId={TENANT_ID} slug={slug} onSaved={onSaved} />);
  return { onSaved, user: userEvent.setup() };
};

// Opens editing and replaces the subdomain with `slug`.
const typeSlug = async (user: ReturnType<typeof userEvent.setup>, slug: string) => {
  await user.click(screen.getByRole("button", { name: "Change" }));
  await user.clear(screen.getByLabelText("Subdomain"));
  if (slug) await user.type(screen.getByLabelText("Subdomain"), slug);
};

describe("SlugSetting", () => {
  beforeEach(() => {
    vi.mocked(updateSlug).mockReset().mockResolvedValue(null);
  });

  it("shows the registration site's address, not an input", () => {
    renderSetting();
    expect(screen.getByText("spring-dance.folkreg.org")).toBeInTheDocument();
    expect(screen.queryByLabelText("Subdomain")).not.toBeInTheDocument();
  });

  it("moves the site only once the move is confirmed", async () => {
    const { onSaved, user } = renderSetting();
    await typeSlug(user, "spring-weekend");
    await user.click(screen.getByRole("button", { name: "Save" }));

    const dialog = screen.getByRole("alertdialog", { name: "Move the registration site?" });
    expect(dialog).toHaveTextContent("From spring-dance.folkreg.org to spring-weekend.folkreg.org.");
    expect(updateSlug).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Move it" }));
    expect(updateSlug).toHaveBeenCalledExactlyOnceWith(TENANT_ID, "spring-weekend");
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith("spring-weekend"));
    expect(screen.queryByLabelText("Subdomain")).not.toBeInTheDocument();
  });

  // Enter in the field is Save, like a button press.
  it("asks to confirm when Enter is pressed", async () => {
    const { user } = renderSetting();
    await typeSlug(user, "spring-weekend{Enter}");
    expect(screen.getByRole("alertdialog", { name: "Move the registration site?" })).toBeInTheDocument();
  });

  it("changes nothing when the move is cancelled", async () => {
    const { onSaved, user } = renderSetting();
    await typeSlug(user, "spring-weekend");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(updateSlug).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Subdomain")).toHaveValue("spring-weekend"); // still editing
  });

  it("goes back to the address on Cancel, or on saving it unchanged", async () => {
    const { user } = renderSetting();
    await user.click(screen.getByRole("button", { name: "Change" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("spring-dance.folkreg.org")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Change" }));
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(updateSlug).not.toHaveBeenCalled();
  });

  // The subdomain is a hostname: the rule it breaks shows under the field, and nothing is offered.
  it.each([
    ["", "Required"],
    ["Spring Dance", "Lowercase letters, numbers, and hyphens only"],
    ["dance-", "Can't start or end with a hyphen"],
    ["admin", "That name is reserved"],
  ])("flags %j and doesn't ask to save it", async (slug, message) => {
    const { user } = renderSetting();
    await typeSlug(user, slug);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(updateSlug).not.toHaveBeenCalled();
  });

  // E.g. another tenant took it; the error shows where it can be fixed.
  it("shows a save error under the field and stays editing", async () => {
    vi.mocked(updateSlug).mockResolvedValue("That subdomain is already taken");
    const { onSaved, user } = renderSetting();
    await typeSlug(user, "other-tenant");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Move it" }));

    expect(await screen.findByText("That subdomain is already taken")).toBeInTheDocument();
    expect(screen.getByLabelText("Subdomain")).toHaveValue("other-tenant");
    expect(onSaved).not.toHaveBeenCalled();
  });
});
