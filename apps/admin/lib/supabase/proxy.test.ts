import { describe, it, expect, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_OWNER_EMAIL, TEST_PASSWORD } from "@/test/supabase";
import { handleAuthSession } from "./proxy";

// Real session cookies, produced by @supabase/ssr itself signing in against a throwaway
// in-memory cookie jar -- so the proxy is tested against the exact cookie format/chunking the
// app sees in production, not a hand-built imitation of it.
const signedInCookieHeader = async () => {
  const jar = new Map<string, string>();
  const client = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await client.auth.signInWithPassword({ email: ADMIN_OWNER_EMAIL, password: TEST_PASSWORD });
  if (error) throw error;
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
};

const request = (path: string, cookie?: string) =>
  new NextRequest(new URL(path, "http://localhost:3001"), { headers: cookie ? { cookie } : {} });

// NextResponse.next() marks "continue to the route" with this header; a redirect doesn't.
const passesThrough = (response: Response) => response.headers.get("x-middleware-next") === "1";

describe("handleAuthSession", () => {
  let cookie: string;
  beforeAll(async () => {
    cookie = await signedInCookieHeader();
  });

  describe("without a session", () => {
    // /login included: login lives under /auth, so a bare /login is just another unknown path.
    it.each(["/dashboard", "/dashboard/00000000-0000-0000-0000-000000000000/general", "/anything-else", "/login"])(
      "redirects %s to /auth/login",
      async (path) => {
        const response = await handleAuthSession(request(path));
        expect(response.status).toBe(307);
        expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/login");
      },
    );

    it("keeps the original host on the redirect", async () => {
      const response = await handleAuthSession(request("/dashboard"));
      expect(new URL(response.headers.get("location")!).origin).toBe("http://localhost:3001");
    });

    // The login page itself (and the root) must stay reachable logged out, or the redirect
    // would loop.
    it.each(["/", "/auth/login", "/auth/anything"])("lets %s through", async (path) => {
      expect(passesThrough(await handleAuthSession(request(path)))).toBe(true);
    });
  });

  describe("with a session", () => {
    it.each(["/dashboard", "/dashboard/00000000-0000-0000-0000-000000000000/general"])("lets %s through", async (path) => {
      expect(passesThrough(await handleAuthSession(request(path, cookie)))).toBe(true);
    });
  });

  it("treats a garbage auth cookie as logged out", async () => {
    const response = await handleAuthSession(request("/dashboard", "sb-127-auth-token=garbage"));
    expect(response.status).toBe(307);
  });
});
