import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormLabel } from "./form-label";

describe("FormLabel", () => {
  it("renders an asterisk for required fields, hidden from assistive tech", () => {
    render(<FormLabel htmlFor="x" required>Title</FormLabel>);
    const asterisk = screen.getByText("*");
    expect(asterisk).toHaveAttribute("aria-hidden");
    // The asterisk is decorative, so the label's accessible name is just its text.
    expect(screen.getByText("Title").closest("label")).toHaveAttribute("for", "x");
  });

  it("renders no asterisk when not required", () => {
    render(<FormLabel>Title</FormLabel>);
    expect(screen.queryByText("*")).not.toBeInTheDocument();
  });
});
