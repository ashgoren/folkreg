import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AutosaveStatus } from "./autosave-status";

describe("AutosaveStatus", () => {
  it("shows Saving… while a save is in flight, even if one also just finished", () => {
    render(<AutosaveStatus isPending savedRecently />);
    expect(screen.getByText("Saving…")).toBeInTheDocument();
    expect(screen.queryByText("Saved ✓")).not.toBeInTheDocument();
  });

  it("shows Saved ✓ after a recent save", () => {
    render(<AutosaveStatus isPending={false} savedRecently />);
    expect(screen.getByText("Saved ✓")).toBeInTheDocument();
  });

  it("shows nothing when idle", () => {
    const { container } = render(<AutosaveStatus isPending={false} savedRecently={false} />);
    expect(container).toHaveTextContent("");
  });
});
