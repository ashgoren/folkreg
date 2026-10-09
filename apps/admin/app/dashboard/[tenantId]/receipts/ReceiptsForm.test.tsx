import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTenant } from "@/test/fixtures";
import { expectLastSave, expectNoSave } from "@/test/autosave";

vi.mock("./actions", () => ({ updateReceipts: vi.fn() }));
import { updateReceipts } from "./actions";
import { ReceiptsForm } from "./ReceiptsForm";

describe("ReceiptsForm", () => {
  beforeEach(() => {
    vi.mocked(updateReceipts).mockReset().mockResolvedValue(null);
  });

  it("populates from receipts_config, or blank for a new tenant", () => {
    const { unmount } = render(<ReceiptsForm tenant={makeTenant({ receipts_config: { emailFrom: "from@example.com", emailReplyTo: "" } })} />);
    expect(screen.getByLabelText("From address")).toHaveValue("from@example.com");
    expect(screen.getByLabelText(/Reply-to/)).toHaveValue("");
    unmount();

    render(<ReceiptsForm tenant={makeTenant()} />);
    expect(screen.getByLabelText("From address")).toHaveValue("");
  });

  it("autosaves valid addresses", async () => {
    const tenant = makeTenant();
    const user = userEvent.setup();
    render(<ReceiptsForm tenant={tenant} />);

    await user.type(screen.getByLabelText("From address"), "from@example.com");
    await user.tab();
    await expectLastSave(vi.mocked(updateReceipts), tenant.id, { emailFrom: "from@example.com", emailReplyTo: "" });
  });

  it("allows clearing an address back to blank", async () => {
    const tenant = makeTenant({ receipts_config: { emailFrom: "from@example.com", emailReplyTo: "reply@example.com" } });
    const user = userEvent.setup();
    render(<ReceiptsForm tenant={tenant} />);

    await user.clear(screen.getByLabelText(/Reply-to/));
    await user.tab();
    await expectLastSave(vi.mocked(updateReceipts), tenant.id, { emailFrom: "from@example.com", emailReplyTo: "" });
  });

  it("flags a malformed address and doesn't save it", async () => {
    const user = userEvent.setup();
    render(<ReceiptsForm tenant={makeTenant()} />);

    await user.type(screen.getByLabelText("From address"), "not-an-email");
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent("Must be a valid email");
    await expectNoSave(vi.mocked(updateReceipts));
  });
});
