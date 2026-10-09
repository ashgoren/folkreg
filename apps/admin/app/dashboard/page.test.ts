import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
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

  it("redirects a user who owns no tenant to the login page", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(await signInAs(ORPHAN_EMAIL));
    await expect(DashboardPage()).rejects.toEqual(redirectTo("/auth/login"));
  });
});
