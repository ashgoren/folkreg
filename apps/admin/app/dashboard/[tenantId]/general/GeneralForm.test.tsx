import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTenant } from "@/test/fixtures";
import { expectLastSave, expectNoSave } from "@/test/autosave";

vi.mock("./actions", () => ({ updateGeneral: vi.fn() }));
import { updateGeneral } from "./actions";
import { GeneralForm } from "./GeneralForm";

describe("GeneralForm", () => {
  beforeEach(() => {
    vi.mocked(updateGeneral).mockReset().mockResolvedValue(null);
  });

  it("populates from the tenant", () => {
    render(<GeneralForm tenant={makeTenant({ slug: "spring-dance", is_live: true, show_preregistration: true })} />);
    expect(screen.getByLabelText(/Subdomain/)).toHaveValue("spring-dance");
    expect(screen.getByRole("switch", { name: /Live mode/ })).toBeChecked();
    expect(screen.getByRole("switch", { name: /Show preregistration/ })).toBeChecked();
  });

  it("autosaves every field together when one changes", async () => {
    const tenant = makeTenant({ slug: "spring-dance" });
    const user = userEvent.setup();
    render(<GeneralForm tenant={tenant} />);

    await user.click(screen.getByRole("switch", { name: /Show preregistration/ }));
    await expectLastSave(vi.mocked(updateGeneral), tenant.id, { slug: "spring-dance", is_live: false, show_preregistration: true });

    const slug = screen.getByLabelText(/Subdomain/);
    await user.clear(slug);
    await user.type(slug, "fall-dance");
    await user.tab();
    await expectLastSave(vi.mocked(updateGeneral), tenant.id, { slug: "fall-dance", is_live: false, show_preregistration: true });
  });

  // Text saves when the field loses focus, not while typing: saving mid-word would make each
  // partial slug ("ab", "abc", ...) the tenant's live subdomain in turn.
  it("saves typing once, when the field loses focus", async () => {
    const tenant = makeTenant({ slug: "a" });
    const user = userEvent.setup();
    render(<GeneralForm tenant={tenant} />);

    await user.type(screen.getByLabelText(/Subdomain/), "bcdef");
    await expectNoSave(vi.mocked(updateGeneral));

    await user.tab();
    await expectLastSave(vi.mocked(updateGeneral), tenant.id, expect.objectContaining({ slug: "abcdef" }));
    expect(updateGeneral).toHaveBeenCalledTimes(1);
  });

  it("flags an invalid slug inline and never sends it to the server", async () => {
    const user = userEvent.setup();
    render(<GeneralForm tenant={makeTenant()} />);

    const slug = screen.getByLabelText(/Subdomain/);
    await user.clear(slug);
    await user.type(slug, "Spring Dance");
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent("Lowercase letters, numbers, and hyphens only");
    await expectNoSave(vi.mocked(updateGeneral));
  });

  it("requires a slug -- the one General field that can't be blank", async () => {
    const user = userEvent.setup();
    render(<GeneralForm tenant={makeTenant()} />);

    await user.clear(screen.getByLabelText(/Subdomain/));
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent("Required");
    await expectNoSave(vi.mocked(updateGeneral));
  });

  it("labels sandbox vs. live mode, and follows the switch", async () => {
    const tenant = makeTenant({ is_live: false });
    const user = userEvent.setup();
    render(<GeneralForm tenant={tenant} />);

    expect(screen.getByText("SANDBOX")).toBeInTheDocument();
    expect(screen.getByText("closed")).toBeInTheDocument();

    await user.click(screen.getByRole("switch", { name: /Live mode/ }));
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText("open")).toBeInTheDocument();
    await expectLastSave(vi.mocked(updateGeneral), tenant.id, expect.objectContaining({ is_live: true }));
  });

  // The slug is a hostname: the rule it breaks shows under the field, and it isn't saved.
  it.each([
    ["admin", "That name is reserved"],
    ["dance-", "Can't start or end with a hyphen"],
  ])("flags the subdomain %j and doesn't save it", async (slug, message) => {
    const user = userEvent.setup();
    render(<GeneralForm tenant={makeTenant({ slug: "spring-dance" })} />);

    await user.clear(screen.getByLabelText(/Subdomain/));
    await user.type(screen.getByLabelText(/Subdomain/), slug);
    await user.tab();

    expect(await screen.findByText(message)).toBeInTheDocument();
    await expectNoSave(vi.mocked(updateGeneral));
  });
});
