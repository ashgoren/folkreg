import { describe, it, expect, vi, beforeEach } from "vitest";
import { ADMIN_OWNER_EMAIL, TEST_PASSWORD, createAnonClient } from "@/test/supabase";
import { redirectTo } from "@/test/next-navigation";
import type { DbClient } from "@repo/types";

// See app/dashboard/[tenantId]/general/actions.test.ts for why only the server client factory
// is mocked; next/navigation is mocked because redirect() only works inside a Next request.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", async () => (await import("@/test/next-navigation")).navigationMock);
import { createClient } from "@/lib/supabase/server";
import { login } from "./actions";

const form = (email: string, password: string) => {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
};

describe("login", () => {
  // A fresh logged-out client per test -- signing in mutates the client's session, which is
  // exactly what's being asserted on.
  let client: DbClient;
  beforeEach(() => {
    client = createAnonClient();
    vi.mocked(createClient).mockResolvedValue(client);
  });

  it("signs in and redirects to /dashboard", async () => {
    await expect(login(null, form(ADMIN_OWNER_EMAIL, TEST_PASSWORD))).rejects.toEqual(redirectTo("/dashboard"));
    const { data: { user } } = await client.auth.getUser();
    expect(user?.email).toBe(ADMIN_OWNER_EMAIL);
  });

  it("returns Supabase's error message for a wrong password, without redirecting", async () => {
    expect(await login(null, form(ADMIN_OWNER_EMAIL, "wrong-password"))).toBe("Invalid login credentials");
    expect((await client.auth.getSession()).data.session).toBeNull();
  });

  // Same message as a wrong password, so the login form can't be used to probe which
  // emails have accounts.
  it("returns the same message for an unknown email", async () => {
    expect(await login(null, form("nobody@test.local", TEST_PASSWORD))).toBe("Invalid login credentials");
  });
});
