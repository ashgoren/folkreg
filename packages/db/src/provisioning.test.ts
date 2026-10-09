import { describe, it, expect, afterEach } from "vitest";
import { defaultTenantConfig } from "@repo/tenant-config";
import type { DbClient } from "@repo/types";
import { createTestClient } from "./test-helpers";
import { createTenant, createTenantWithOwner } from "./provisioning";

const supabase = createTestClient();

// Each test creates its own tenant and user under names unique to this run, so it can't collide
// with the seeded fixtures or with another suite running in parallel. Everything created is
// removed afterward; deleting a tenant cascades to its tenant_secrets row.
const unique = () => `provisioning-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const created: { tenantIds: string[]; userIds: string[] } = { tenantIds: [], userIds: [] };

afterEach(async () => {
  for (const id of created.tenantIds) await supabase.from("tenants").delete().eq("id", id);
  for (const id of created.userIds) await supabase.auth.admin.deleteUser(id);
  created.tenantIds = [];
  created.userIds = [];
});

const findUserByEmail = async (email: string) => {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((user) => user.email === email) ?? null;
};

describe("createTenant", () => {
  it("writes the full default config, leaves spreadsheet_config null, and gets a secrets row", async () => {
    const slug = unique();
    const tenantId = await createTenant(supabase, { slug, ownerId: null });
    created.tenantIds.push(tenantId);

    const { data: tenant } = await supabase.from("tenants").select("*").eq("id", tenantId).single();
    // event_config's year is computed per call, so it's compared separately from the rest.
    const { event_config, ...defaults } = defaultTenantConfig();
    expect(tenant).toMatchObject({ slug, owner_id: null, is_live: false, spreadsheet_config: null, ...defaults });
    expect(tenant?.event_config).toEqual(event_config);

    const { data: secrets } = await supabase.from("tenant_secrets").select("tenant_id").eq("tenant_id", tenantId);
    expect(secrets).toHaveLength(1);
  });
});

describe("createTenantWithOwner", () => {
  it("creates a confirmed user who owns the new tenant and can sign in", async () => {
    const slug = unique();
    const email = `${slug}@test.local`;
    const { userId, tenantId } = await createTenantWithOwner(supabase, { slug, email, password: "test-password" });
    created.userIds.push(userId);
    created.tenantIds.push(tenantId);

    const { data: tenant } = await supabase.from("tenants").select("owner_id").eq("id", tenantId).single();
    expect(tenant?.owner_id).toBe(userId);
    expect((await findUserByEmail(email))?.email_confirmed_at).toBeTruthy();
  });

  // The slug check runs before the user is created, so a taken slug never produces a user.
  it("rejects a taken slug without creating a user", async () => {
    const email = `${unique()}@test.local`;
    await expect(createTenantWithOwner(supabase, { slug: "test-tenant", email, password: "test-password" }))
      .rejects.toThrow('Slug "test-tenant" is already taken');
    expect(await findUserByEmail(email)).toBeNull();
  });

  // A failure after the user exists (e.g. a slug taken in the moment between the check and the
  // insert) is simulated by making the tenants insert fail. The user must be removed again.
  it("deletes the new user when the tenant insert fails", async () => {
    const slug = unique();
    const email = `${slug}@test.local`;
    const failingInserts = new Proxy(supabase, {
      get: (target, prop, receiver) => prop !== "from"
        ? Reflect.get(target, prop, receiver)
        : (table: string) => {
            const builder = target.from(table as "tenants");
            if (table !== "tenants") return builder;
            return Object.assign(builder, {
              insert: () => ({ select: () => ({ single: async () => ({ data: null, error: new Error("insert failed") }) }) }),
            });
          },
    }) as DbClient;

    await expect(createTenantWithOwner(failingInserts, { slug, email, password: "test-password" })).rejects.toThrow("insert failed");
    expect(await findUserByEmail(email)).toBeNull();
  });
});
