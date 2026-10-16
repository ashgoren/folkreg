"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dataThemeAttribute, nextTheme, readThemeCookie, writeThemeCookie, type Theme } from "@/lib/theme";

const ICONS: Record<Theme, React.ReactNode> = {
  auto: <SunMoon aria-hidden />,
  light: <Sun aria-hidden />,
  dark: <Moon aria-hidden />,
};

// The browser fires no event when a cookie changes, so a change is announced instead: a window
// event for this tab, and a BroadcastChannel message for any other open tabs (a channel
// doesn't deliver to the instance that posted, so this tab still needs the window event).
const THEME_EVENT = "theme-change";

// Created on first use rather than at module load since the module is also loaded on the server.
let channel: BroadcastChannel | null | undefined;
const getChannel = () => (channel ??= typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("theme"));

const subscribe = (onChange: () => void) => {
  window.addEventListener(THEME_EVENT, onChange);
  getChannel()?.addEventListener("message", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    getChannel()?.removeEventListener("message", onChange);
  };
};

type ThemeToggleProps = {
  initialTheme: Theme;
};

// Steps through auto, light, and dark. The cookie is the store: the server renders the page from
// it, and this reads it back in the browser. During hydration useSyncExternalStore uses the server's
// value (`initialTheme`), which matches the cookie, so the right icon shows from the first paint.
export function ThemeToggle({ initialTheme }: ThemeToggleProps) {
  const theme = useSyncExternalStore(subscribe, readThemeCookie, () => initialTheme);

  // Keeps html's data-theme in step with the cookie. An effect rather than part of the click, so
  // other tabs follow too: their re-read cookie changes `theme`, which runs this in each of them.
  // On the first render it rewrites the value the server already set, which changes nothing.
  useEffect(() => {
    const attribute = dataThemeAttribute(theme);
    if (attribute) document.documentElement.setAttribute("data-theme", attribute);
    else document.documentElement.removeAttribute("data-theme");
  }, [theme]);

  const cycle = () => {
    const next = nextTheme(theme);
    writeThemeCookie(next);
    window.dispatchEvent(new Event(THEME_EVENT));
    getChannel()?.postMessage(next);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={`Theme: ${theme}. Change theme`}
      title={`Theme: ${theme}`}
    >
      {ICONS[theme]}
    </Button>
  );
}
