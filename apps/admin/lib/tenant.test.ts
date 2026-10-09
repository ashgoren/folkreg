import { describe, it, expect, vi, beforeAll } from "vitest";
import {
  ADMIN_OWNER_EMAIL, ADMIN_TENANT_SLUG, OTHER_TENANT_SLUG,
  createAnonClient, createServiceClient, getTenantIdBySlug, signInAs,
} from "@/test/supabase";
import { notFoundError } from "@/test/next-navigation";
import type { DbClient } from "@repo/types";

// See app/auth/login/actions.test.ts for why these two modules are mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", async () => (await import("@/test/next-navigation")).navigationMock);
import { createClient } from "@/lib/supabase/server";
import { getPageTenant, getRequestUser, getTenantByOwner } from "./tenant";

const service = createServiceClient();
let owner: DbClient;
let tenantId: string;
let otherTenantId: string;

beforeAll(async () => {
  owner = await signInAs(ADMIN_OWNER_EMAIL);
  tenantId = await getTenantIdBySlug(service, ADMIN_TENANT_SLUG);
  otherTenantId = await getTenantIdBySlug(service, OTHER_TENANT_SLUG);
});

describe("getTenantByOwner", () => {
  it("finds the tenant the user owns", async () => {
    const { data: { user } } = await owner.auth.getUser();
    expect(await getTenantByOwner(owner, user!.id)).toEqual({ id: tenantId });
  });

  it("returns null for a user who owns no tenant", async () => {
    expect(await getTenantByOwner(owner, "00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  // RLS only exposes tenants the caller owns, so looking up someone else's owner id
  // finds nothing -- the same as if they owned no tenant.
  it("can't see another owner's tenant through RLS", async () => {
    const { data } = await service.from("tenants").select("owner_id").eq("id", otherTenantId).single();
    expect(await getTenantByOwner(owner, data!.owner_id!)).toBeNull();
  });
});

// React.cache() is a pass-through outside a React Server Components render, so each call
// here makes a fresh request -- which lets the mocked createClient vary per test.
describe("getRequestUser", () => {
  it("returns the signed-in user", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(owner);
    expect((await getRequestUser())?.email).toBe(ADMIN_OWNER_EMAIL);
  });

  it("returns null without a session", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(createAnonClient());
    expect(await getRequestUser()).toBeNull();
  });
});

describe("getPageTenant", () => {
  it("returns the tenant row and a tenant-scoped db accessor", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(owner);
    const { tenant, db } = await getPageTenant(tenantId);
    expect(tenant.slug).toBe(ADMIN_TENANT_SLUG);
    expect((await db.getSecrets()).tenant_id).toBe(tenantId);
  });

  it("404s for a tenant the user doesn't own", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(owner);
    await expect(getPageTenant(otherTenantId)).rejects.toEqual(notFoundError());
  });

  it("404s for a tenant that doesn't exist", async () => {
    vi.mocked(createClient).mockResolvedValueOnce(owner);
    await expect(getPageTenant("00000000-0000-0000-0000-000000000000")).rejects.toEqual(notFoundError());
  });
});
