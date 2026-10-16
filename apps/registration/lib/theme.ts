// The registrant's color theme. "auto" follows the OS setting and is stored as no cookie at all;
// "light" and "dark" are explicit choices, stored in the `theme` cookie. The cookie is host-only
// (no Domain attribute), so each tenant's site at {slug}.folkreg.org remembers its own choice.
// Same cookie name and values as the organizers' static event sites, though the two can't share
// a cookie across their different domains.

export type Theme = "auto" | "light" | "dark";

export const THEME_COOKIE = "theme";

const CYCLE: Theme[] = ["auto", "light", "dark"];

export const nextTheme = (theme: Theme): Theme => CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]!;

// A cookie value as a Theme. Anything missing or unrecognized is "auto".
export const parseTheme = (value: string | undefined): Theme =>
  value === "light" || value === "dark" ? value : "auto";

// data-theme on <html>: the explicit choice, or no attribute for auto, which globals.css then
// resolves from the OS setting with a media query.
export const dataThemeAttribute = (theme: Theme): "light" | "dark" | undefined =>
  theme === "auto" ? undefined : theme;


// BROWSER ONLY:

export const readThemeCookie = (): Theme => {
  const prefix = `${THEME_COOKIE}=`;
  const pair = document.cookie.split("; ").find((part) => part.startsWith(prefix));
  return parseTheme(pair?.slice(prefix.length));
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

// Choosing "auto" deletes the cookie, so an unset preference and a reset one look the same to the server.
export const writeThemeCookie = (theme: Theme) => {
  if (theme === "auto") {
    document.cookie = `${THEME_COOKIE}=; Path=/; Max-Age=0`;
    return;
  }
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax${secure}`;
};
