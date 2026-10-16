import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { createTenantDb } from "@repo/db/queries";
import { defaultFieldsConfig, defaultRegistrationConfig } from "@repo/tenant-config";
import type { Person } from "@repo/types";
import { createServiceClient, getTenantIdBySlug, resetTenant, updateTenantConfig, REGISTRATION_TENANT_SLUG } from "../test/supabase";
import { buildDefaultPerson } from "./registration-party";

vi.mock("@/lib/tenant", () => ({ getRequestTenant: vi.fn() }));
import { getRequestTenant } from "@/lib/tenant";
import { submitRegistration } from "./actions";

const service = createServiceClient();
let tenantId: string;
let db: ReturnType<typeof createTenantDb>;

// submitRegistration redirects instead of returning the order it created, so a test finds it by the
// tenant's orders -- each test starts with none (beforeEach), so there's at most one.
const findOrders = async () => (await service.from("orders").select("*").eq("tenant_id", tenantId)).data!;

// Matches every field defaultFieldsConfig() (the seed tenant's reset state) marks required --
// same convention as registration-party.test.ts's validPerson.
const validPerson = (overrides: Partial<Person> = {}): Person => ({
  ...buildDefaultPerson(defaultFieldsConfig()),
  first: "Test",
  last: "Person",
  nametag: "Test",
  email: "test@example.com",
  emailConfirmation: "test@example.com",
  phone: "555-555-5555",
  address: "123 Main St",
  city: "Springfield",
  state: "OR",
  zip: "97477",
  agreement: ["yes"],
  ...overrides,
});

beforeAll(async () => {
  tenantId = await getTenantIdBySlug(service, REGISTRATION_TENANT_SLUG);
  db = createTenantDb(service, tenantId);
});

beforeEach(async () => {
  await resetTenant(service, tenantId);
  await updateTenantConfig(service, tenantId, { registration_config: { ...defaultRegistrationConfig(), opening: "now" } });
  vi.mocked(getRequestTenant).mockImplementation(async () => ({ db, tenant: (await db.getTenant())! }));
  await service.from("orders").delete().eq("tenant_id", tenantId);
});

afterAll(async () => {
  await service.from("orders").delete().eq("tenant_id", tenantId);
});

const party = { registrant: validPerson(), companions: [] };

describe("submitRegistration", () => {
  // redirect() throws (by design, in real Next.js code) rather than returning -- the success path
  // is covered through this, not by inspecting a resolved value.
  it("creates and confirms the order and throws to redirect, for a pay-mode tenant", async () => {
    await expect(submitRegistration(party)).rejects.toThrow();

    const [order] = await findOrders();
    expect(order!.people).toEqual([validPerson()]);
    expect(order!.is_test).toBe(false);
    expect(order!.registered_at).not.toBeNull();
    expect(order!.submission_mode).toBe("pay");
  });

  it("stores the registrant first, then companions, as the order's people", async () => {
    const companion = validPerson({ first: "Companion" });

    await expect(submitRegistration({ registrant: validPerson(), companions: [companion] })).rejects.toThrow();

    const [order] = await findOrders();
    expect((order!.people as Person[]).map((person) => person.first)).toEqual(["Test", "Companion"]);
  });

  it("records a lottery-mode tenant's order as lottery", async () => {
    await updateTenantConfig(service, tenantId, { registration_config: { ...defaultRegistrationConfig(), opening: "now", mode: "lottery" } });

    await expect(submitRegistration(party)).rejects.toThrow();

    const [order] = await findOrders();
    expect(order!.submission_mode).toBe("lottery");
  });

  it("refuses once registration is no longer open, without creating an order", async () => {
    await updateTenantConfig(service, tenantId, { registration_config: { ...defaultRegistrationConfig(), opening: "closed" } });

    const result = await submitRegistration(party);

    expect(result).toMatchObject({ error: expect.any(String) });
    expect(await findOrders()).toHaveLength(0);
  });

  it("refuses values that don't pass strict validation, without creating an order", async () => {
    const result = await submitRegistration({ registrant: validPerson({ email: "" }), companions: [] });

    expect(result).toMatchObject({ error: expect.any(String) });
    expect(await findOrders()).toHaveLength(0);
  });
});
