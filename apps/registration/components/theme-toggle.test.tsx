import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeToggle } from "./theme-toggle";

const themeCookie = () => document.cookie.split("; ").find((part) => part.startsWith("theme="));

afterEach(() => {
  document.cookie = "theme=; Path=/; Max-Age=0";
  document.documentElement.removeAttribute("data-theme");
});

describe("ThemeToggle", () => {
  it("starts from the theme the server rendered", () => {
    document.cookie = "theme=dark; Path=/";
    render(<ThemeToggle initialTheme="dark" />);

    expect(screen.getByRole("button", { name: /theme: dark/i })).toBeInTheDocument();
  });

  it("steps auto, light, dark, auto, saving each choice and applying it to the page", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle initialTheme="auto" />);
    const button = screen.getByRole("button", { name: /theme/i });

    await user.click(button);
    expect(button).toHaveAccessibleName(/theme: light/i);
    expect(themeCookie()).toBe("theme=light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    await user.click(button);
    expect(button).toHaveAccessibleName(/theme: dark/i);
    expect(themeCookie()).toBe("theme=dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    // Back to auto: no cookie and no attribute, so the CSS follows the OS setting.
    await user.click(button);
    expect(button).toHaveAccessibleName(/theme: auto/i);
    expect(themeCookie()).toBeUndefined();
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
});
