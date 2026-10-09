import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeTenant } from "@/test/fixtures";
import { expectLastSave, expectNoSave } from "@/test/autosave";
import type { ThemeConfig } from "@repo/types";

vi.mock("./actions", () => ({ updateAppearance: vi.fn() }));
import { updateAppearance } from "./actions";
import { AppearanceForm } from "./AppearanceForm";

const DEFAULTS: ThemeConfig = {
  backgroundLight: "#ffffff",
  foregroundLight: "#0a0a0a",
  accentLight: "#2563eb",
  backgroundDark: "#0a0a0a",
  foregroundDark: "#fafafa",
  accentDark: "#3b82f6",
};

// Each label ("Background", etc.) appears once per light/dark section, so fields are looked up
// by their stable ids instead.
const textInput = (name: keyof ThemeConfig) => document.getElementById(`appearance-${name}`) as HTMLInputElement;

describe("AppearanceForm", () => {
  beforeEach(() => {
    vi.mocked(updateAppearance).mockReset().mockResolvedValue(null);
  });

  it("falls back to the default palette when theme_config is null", () => {
    render(<AppearanceForm tenant={makeTenant()} />);
    for (const [name, value] of Object.entries(DEFAULTS)) {
      expect(textInput(name as keyof ThemeConfig)).toHaveValue(value);
    }
  });

  it("populates from theme_config", () => {
    render(<AppearanceForm tenant={makeTenant({ theme_config: { ...DEFAULTS, accentLight: "#d97706" } })} />);
    expect(textInput("accentLight")).toHaveValue("#d97706");
  });

  it("autosaves a typed hex color", async () => {
    const tenant = makeTenant();
    const user = userEvent.setup();
    render(<AppearanceForm tenant={tenant} />);

    await user.clear(textInput("accentDark"));
    await user.type(textInput("accentDark"), "#123abc");
    await expectLastSave(vi.mocked(updateAppearance), tenant.id, { ...DEFAULTS, accentDark: "#123abc" });
  });

  it("keeps the swatch and the text input in sync, both directions", async () => {
    const tenant = makeTenant();
    const user = userEvent.setup();
    render(<AppearanceForm tenant={tenant} />);

    const [lightBackgroundSwatch] = screen.getAllByLabelText("Background swatch");
    // userEvent can't drive a native color picker, so set the value the way the picker would.
    fireEvent.change(lightBackgroundSwatch!, { target: { value: "#ff0000" } });
    expect(textInput("backgroundLight")).toHaveValue("#ff0000");
    await expectLastSave(vi.mocked(updateAppearance), tenant.id, { ...DEFAULTS, backgroundLight: "#ff0000" });

    await user.clear(textInput("backgroundLight"));
    await user.type(textInput("backgroundLight"), "#00ff00");
    expect(lightBackgroundSwatch).toHaveValue("#00ff00");
    await expectLastSave(vi.mocked(updateAppearance), tenant.id, { ...DEFAULTS, backgroundLight: "#00ff00" });
  });

  it("flags an invalid hex color and doesn't save it", async () => {
    const user = userEvent.setup();
    render(<AppearanceForm tenant={makeTenant()} />);

    await user.clear(textInput("foregroundLight"));
    await user.type(textInput("foregroundLight"), "red");
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent("Must be a hex color");
    await expectNoSave(vi.mocked(updateAppearance));
  });
});
