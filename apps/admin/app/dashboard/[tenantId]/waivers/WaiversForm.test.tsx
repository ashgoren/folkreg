import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeSecrets, makeTenant } from "@/test/fixtures";
import { expectLastSave } from "@/test/autosave";

vi.mock("./actions", () => ({ updateWaivers: vi.fn() }));
import { updateWaivers } from "./actions";
import { WaiversForm } from "./WaiversForm";

describe("WaiversForm", () => {
  beforeEach(() => {
    vi.mocked(updateWaivers).mockReset().mockResolvedValue(null);
  });

  it("hides the DocuSeal fields while the waiver is off", () => {
    render(<WaiversForm tenant={makeTenant()} secrets={makeSecrets()} />);
    expect(screen.getByRole("switch", { name: /Show waiver/ })).not.toBeChecked();
    expect(screen.queryByLabelText("DocuSeal template ID")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("DocuSeal API key")).not.toBeInTheDocument();
  });

  it("shows the DocuSeal fields populated from waiver_config and tenant_secrets when on", () => {
    render(
      <WaiversForm
        tenant={makeTenant({ waiver_config: { show: true, docusealTemplateId: "tmpl_1" } })}
        secrets={makeSecrets({ docuseal_key: "key_1" })}
      />,
    );
    expect(screen.getByLabelText("DocuSeal template ID")).toHaveValue("tmpl_1");
    // The API key is a SecretInput: present and filled, but masked.
    expect(screen.getByLabelText("DocuSeal API key")).toHaveValue("key_1");
    expect(screen.getByLabelText("DocuSeal API key")).toHaveAttribute("type", "password");
  });

  it("autosaves template id and API key together", async () => {
    const tenant = makeTenant();
    const user = userEvent.setup();
    render(<WaiversForm tenant={tenant} secrets={makeSecrets()} />);

    await user.click(screen.getByRole("switch", { name: /Show waiver/ }));
    await user.type(screen.getByLabelText("DocuSeal template ID"), "tmpl_9");
    await user.type(screen.getByLabelText("DocuSeal API key"), "key_9");
    await user.tab();

    await expectLastSave(vi.mocked(updateWaivers), tenant.id, { show: true, docusealTemplateId: "tmpl_9", docuseal_key: "key_9" });
  });

  it("keeps the DocuSeal values while toggled off, and restores them when toggled back on", async () => {
    const tenant = makeTenant({ waiver_config: { show: true, docusealTemplateId: "tmpl_1" } });
    const user = userEvent.setup();
    render(<WaiversForm tenant={tenant} secrets={makeSecrets({ docuseal_key: "key_1" })} />);

    await user.click(screen.getByRole("switch", { name: /Show waiver/ }));
    expect(screen.queryByLabelText("DocuSeal template ID")).not.toBeInTheDocument();
    // react-hook-form keeps an unmounted field's value (shouldUnregister defaults to false), so
    // turning the waiver off doesn't wipe credentials the organizer already entered.
    await expectLastSave(vi.mocked(updateWaivers), tenant.id, { show: false, docusealTemplateId: "tmpl_1", docuseal_key: "key_1" });

    await user.click(screen.getByRole("switch", { name: /Show waiver/ }));
    expect(screen.getByLabelText("DocuSeal template ID")).toHaveValue("tmpl_1");
    expect(screen.getByLabelText("DocuSeal API key")).toHaveValue("key_1");
    await expectLastSave(vi.mocked(updateWaivers), tenant.id, { show: true, docusealTemplateId: "tmpl_1", docuseal_key: "key_1" });
  });
});
