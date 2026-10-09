import { describe, it, expect, vi, beforeAll } from "vitest";
import { isValidElement } from "react";
import { ADMIN_OWNER_EMAIL, ADMIN_TENANT_SLUG, createAnonClient, createServiceClient, getTenantIdBySlug, signInAs } from "@/test/supabase";
import { notFoundError, redirectTo } from "@/test/next-navigation";

// See app/auth/login/actions.test.ts for why these two modules are mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", async () => (await import("@/test/next-navigation")).navigationMock);
import { createClient } from "@/lib/supabase/server";
import TenantDashboardLayout from "./layout";

let tenantId: string;
beforeAll(async () => {
  tenantId = await getTenantIdBySlug(createServiceClient(), ADMIN_TENANT_SLUG);
});

const renderLayout = (id: string) => TenantDashboardLayout({ children: null, params: Promise.resolve({ tenantId: id }) });

// These only exercise the guards that run before rendering; the rendered sidebar and nav are
// covered by components/AppSidebar.test.tsx and the e2e suite.
describe("tenant dashboard layout", () => {
  // A typo'd URL 404s rather than erroring. This only covers the layout itself: App Router
  // renders a layout and its page concurrently, so the page's getPageTenant() still sends the
  // bad id to Postgres (a 22P02 invalid-uuid error in the dev server log) -- notFound() here
  // decides the response, not whether that query runs.
  it.each(["not-a-uuid", ADMIN_TENANT_SLUG, "123"])("404s for a non-UUID tenant id (%s)", async (id) => {
    vi.mocked(createClient).mockClear();
    await expect(renderLayout(id)).rejects.toEqual(notFoundError());
    expect(createClient).not.toHaveBeenCalled();
  });

  it("redirects a logged-out request to the login page", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(createAnonClient());
    await expect(renderLayout(tenantId)).rejects.toEqual(redirectTo("/auth/login"));
  });

  it("renders for a signed-in user", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(await signInAs(ADMIN_OWNER_EMAIL));
    expect(isValidElement(await renderLayout(tenantId))).toBe(true);
  });
});
