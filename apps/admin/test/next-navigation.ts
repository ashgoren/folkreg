// Stand-ins for next/navigation's redirect() and notFound(). In Next, both work by throwing a
// special error that the framework catches to end rendering -- code after them never runs.
// These throw too (preserving that control flow), with an error that records where the
// request was sent, so tests can assert on it:
//
//   vi.mock("next/navigation", async () => (await import("@/test/next-navigation")).navigationMock);
//   await expect(DashboardPage()).rejects.toEqual(redirectTo("/auth/login"));

import { vi } from "vitest";

export class NavigationError extends Error {
  constructor(public readonly kind: "redirect" | "notFound", public readonly url?: string) {
    super(kind === "redirect" ? `redirect(${url})` : "notFound()");
  }
}

export const redirectTo = (url: string) => new NavigationError("redirect", url);
export const notFoundError = () => new NavigationError("notFound");

export const navigationMock = {
  redirect: vi.fn((url: string) => { throw redirectTo(url); }),
  notFound: vi.fn(() => { throw notFoundError(); }),
};
