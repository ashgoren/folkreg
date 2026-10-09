import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ADMIN_OWNER_EMAIL, ADMIN_TENANT_SLUG, TEST_PASSWORD, createAnonClient, createServiceClient, getTenantIdBySlug, signInAs } from "@/test/supabase";
import { redirectTo } from "@/test/next-navigation";

// See app/auth/login/actions.test.ts for why these two modules are mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", async () => (await import("@/test/next-navigation")).navigationMock);
import { createClient } from "@/lib/supabase/server";
import DashboardPage from "./page";

const service = createServiceClient();
const ORPHAN_EMAIL = "no-tenant@test.local";
let orphanUserId: string | undefined;

// A user who owns no tenant isn't part of the shared seed (nothing else needs one), so it's
// created for this file and deleted afterwards.
beforeAll(async () => {
  const { data, error } = await service.auth.admin.createUser({ email: ORPHAN_EMAIL, password: TEST_PASSWORD, email_confirm: true });
  if (error) throw error;
  orphanUserId = data.user.id;
});
afterAll(async () => {
  if (orphanUserId) await service.auth.admin.deleteUser(orphanUserId);
});

describe("/dashboard", () => {
  it("redirects an owner to their tenant's General page", async () => {
    const tenantId = await getTenantIdBySlug(service, ADMIN_TENANT_SLUG);
    vi.mocked(createClient).mockResolvedValueOnce(await signInAs(ADMIN_OWNER_EMAIL));
    await expect(DashboardPage()).rejects.toEqual(redirectTo(`/dashboard/${tenantId}/general`));
  });

  it("redirects a logged-out request to the login page", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(createAnonClient());
    await expect(DashboardPage()).rejects.toEqual(redirectTo("/auth/login"));
  });

  // Redirecting to the login page would be a dead end: the user is already logged in, so they'd
  // just see the login form again. The page explains instead, and offers a way to log out.
  it("tells a user who owns no tenant that no event is set up, with a way to log out", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(await signInAs(ORPHAN_EMAIL));
    const html = renderToStaticMarkup(await DashboardPage());
    expect(html).toContain("No event set up");
    expect(html).toContain(ORPHAN_EMAIL);
    expect(html).toMatch(/<button[^>]*type="submit"[^>]*>Log out<\/button>/);
  });
});
