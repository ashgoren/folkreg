// What a signed-in owner's own session can write, straight through the API rather than the admin
// UI: RLS limits it to their own rows, and column grants (migration tenant_column_grants) to the
// columns the admin edits. Everything else goes through the service role.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  ADMIN_OWNER_EMAIL, ADMIN_TENANT_SLUG, createAnonClient, createServiceClient, getTenantIdBySlug, readTenant, resetTenant, signInAs,
} from "@/test/supabase";
import type { DbClient } from "@repo/types";

const PERMISSION_DENIED = "42501";

const service = createServiceClient();
let owner: DbClient;
let tenantId: string;

beforeAll(async () => {
  owner = await signInAs(ADMIN_OWNER_EMAIL);
  tenantId = await getTenantIdBySlug(service, ADMIN_TENANT_SLUG);
});
afterAll(() => resetTenant(service, tenantId, ADMIN_TENANT_SLUG));

describe("an owner's session", () => {
  it("can update the columns the admin edits", async () => {
    const { error } = await owner.from("tenants").update({ show_preregistration: true }).eq("id", tenantId);
    expect(error).toBeNull();
    expect((await readTenant(service, tenantId)).show_preregistration).toBe(true);
  });

  // E.g. handing the tenant to another account, or rewriting its history.
  it.each([
    ["owner_id", { owner_id: "00000000-0000-0000-0000-000000000000" }],
    ["id", { id: "00000000-0000-0000-0000-000000000000" }],
    ["created_at", { created_at: "2000-01-01T00:00:00Z" }],
  ] as const)("can't update its tenant's %s", async (_, update) => {
    const { error } = await owner.from("tenants").update(update).eq("id", tenantId);
    expect(error?.code).toBe(PERMISSION_DENIED);
  });

  it("can't create or delete tenants", async () => {
    expect((await owner.from("tenants").delete().eq("id", tenantId)).error?.code).toBe(PERMISSION_DENIED);
    expect((await owner.from("tenants").insert({ slug: "made-by-owner" } as never)).error?.code).toBe(PERMISSION_DENIED);
  });

  it("can update its secrets, but not which tenant they belong to", async () => {
    expect((await owner.from("tenant_secrets").update({ docuseal_key: "key" }).eq("tenant_id", tenantId)).error).toBeNull();
    const { error } = await owner.from("tenant_secrets").update({ tenant_id: "00000000-0000-0000-0000-000000000000" }).eq("tenant_id", tenantId);
    expect(error?.code).toBe(PERMISSION_DENIED);
  });
});

describe("a signed-out session", () => {
  it("can't write tenants at all", async () => {
    const { error } = await createAnonClient().from("tenants").update({ is_live: true }).eq("id", tenantId);
    expect(error?.code).toBe(PERMISSION_DENIED);
  });
});
