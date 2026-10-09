import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SecretInput } from "./secret-input";

describe("SecretInput", () => {
  it("is masked by default and opts out of password-manager autofill", () => {
    render(<SecretInput aria-label="API key" defaultValue="sk_test_123" />);
    const input = screen.getByLabelText("API key");
    expect(input).toHaveAttribute("type", "password");
    // "new-password" (rather than "off", which browsers largely ignore) is what keeps password
    // managers from offering to fill or save an organizer's login into an API-key field.
    expect(input).toHaveAttribute("autocomplete", "new-password");
  });

  it("toggles between masked and revealed", async () => {
    const user = userEvent.setup();
    render(<SecretInput aria-label="API key" defaultValue="sk_test_123" />);
    const input = screen.getByLabelText("API key");

    await user.click(screen.getByRole("button", { name: "Show value" }));
    expect(input).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide value" }));
    expect(input).toHaveAttribute("type", "password");
  });

  it("keeps the reveal toggle out of the tab order and from submitting its form", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const user = userEvent.setup();
    render(<form onSubmit={onSubmit}><SecretInput aria-label="API key" /></form>);

    const toggle = screen.getByRole("button", { name: "Show value" });
    expect(toggle).toHaveAttribute("tabindex", "-1");
    await user.click(toggle);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("forwards its ref and change events to the underlying input", async () => {
    const onChange = vi.fn();
    const ref = { current: null as HTMLInputElement | null };
    const user = userEvent.setup();
    render(<SecretInput aria-label="API key" ref={ref} onChange={onChange} />);

    await user.type(screen.getByLabelText("API key"), "abc");
    expect(ref.current).toBe(screen.getByLabelText("API key"));
    expect(onChange).toHaveBeenCalledTimes(3);
  });
});
