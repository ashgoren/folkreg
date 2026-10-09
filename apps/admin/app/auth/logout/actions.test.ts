import { describe, it, expect, vi } from "vitest";
import { ADMIN_OWNER_EMAIL, signInAs } from "@/test/supabase";
import { redirectTo } from "@/test/next-navigation";

// See app/auth/login/actions.test.ts for why these two modules are mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", async () => (await import("@/test/next-navigation")).navigationMock);
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

describe("logout", () => {
  it("ends the session and redirects to the login page", async () => {
    const client = await signInAs(ADMIN_OWNER_EMAIL);
    vi.mocked(createClient).mockResolvedValue(client);

    await expect(logout()).rejects.toEqual(redirectTo("/auth/login"));
    expect((await client.auth.getSession()).data.session).toBeNull();
  });
});
