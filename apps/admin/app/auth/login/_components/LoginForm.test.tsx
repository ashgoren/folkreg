import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../actions", () => ({ login: vi.fn() }));
import { login } from "../actions";
import { LoginForm } from "./LoginForm";

describe("LoginForm", () => {
  // Block body on purpose: mockReset() returns the mock itself, and a function returned from
  // beforeEach is treated by Vitest as a teardown hook -- it would call login() again after
  // each test.
  beforeEach(() => {
    vi.mocked(login).mockReset();
  });

  it("renders email and password inputs wired for browser autofill", () => {
    render(<LoginForm />);
    const email = screen.getByLabelText("Email");
    const password = screen.getByLabelText("Password");

    expect(email).toHaveAttribute("name", "email");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("autocomplete", "email");
    expect(email).toBeRequired();
    expect(password).toHaveAttribute("name", "password");
    expect(password).toHaveAttribute("type", "password");
    expect(password).toHaveAttribute("autocomplete", "current-password");
    expect(password).toBeRequired();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("submits the entered credentials to the login action and shows the error it returns", async () => {
    vi.mocked(login).mockResolvedValue("Invalid login credentials");
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "organizer@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid login credentials");
    // useActionState calls the action as (previousState, formData).
    const [prevState, formData] = vi.mocked(login).mock.calls[0]!;
    expect(prevState).toBeNull();
    expect(formData.get("email")).toBe("organizer@example.com");
    expect(formData.get("password")).toBe("wrong-password");
  });

  it("disables the button and shows progress while signing in, then refocuses email on failure", async () => {
    let finish!: (error: string) => void;
    vi.mocked(login).mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "organizer@example.com");
    await user.type(screen.getByLabelText("Password"), "pw");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const pending = await screen.findByRole("button", { name: "Signing in…" });
    expect(pending).toBeDisabled();

    finish("Invalid login credentials");
    expect(await screen.findByRole("button", { name: "Sign in" })).toBeEnabled();
    // Focus moves in an effect after the render that re-enables the button, so wait for it too.
    await waitFor(() => expect(screen.getByLabelText("Email")).toHaveFocus());
  });
});
