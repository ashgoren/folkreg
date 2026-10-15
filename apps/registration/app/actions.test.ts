import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import { createTenantDb } from "@repo/db/queries";
import { defaultFieldsConfig, defaultRegistrationConfig } from "@repo/tenant-config";
import type { Person } from "@repo/types";
import { createServiceClient, getTenantIdBySlug, resetTenant, updateTenantConfig, REGISTRATION_TENANT_SLUG } from "../test/supabase";
import { buildDefaultPerson } from "./registration-party";

vi.mock("@/lib/tenant", () => ({ getRequestTenant: vi.fn() }));
vi.mock("@/lib/order-session", () => ({ getOrderFromCookie: vi.fn(), setOrderCookie: vi.fn() }));
import { getRequestTenant } from "@/lib/tenant";
import { getOrderFromCookie, setOrderCookie } from "@/lib/order-session";
import { saveDraft, submitRegistration } from "./actions";

const service = createServiceClient();
let tenantId: string;
let db: ReturnType<typeof createTenantDb>;

// Stands in for the browser's order cookie: setOrderCookie writes it, and getOrderFromCookie reads
// the order back through the real db, so a cookie naming a deleted order reads as null just as it
// does in the app.
let cookieOrderId: string | undefined;

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
  cookieOrderId = undefined;
  vi.mocked(setOrderCookie).mockImplementation(async (orderId) => {
    cookieOrderId = orderId;
  });
  vi.mocked(getOrderFromCookie).mockImplementation(async () => (cookieOrderId ? db.getOrder(cookieOrderId) : null));
});

afterAll(async () => {
  await service.from("orders").delete().eq("tenant_id", tenantId);
});

describe("saveDraft", () => {
  it("creates a new order and sets the cookie", async () => {
    const result = await saveDraft(null, { registrant: validPerson(), companions: [] });
    if ("conflict" in result) throw new Error("expected a created order, got a conflict");

    expect(cookieOrderId).toBeTruthy();
    const order = await db.getOrder(cookieOrderId!);
    expect(order!.updated_at).toBe(result.updatedAt);
    expect(order!.people).toEqual([validPerson()]);
    expect(order!.is_test).toBe(false);
  });

  it("updates the cookie's order without creating a second one", async () => {
    const created = await saveDraft(null, { registrant: validPerson(), companions: [] });
    if ("conflict" in created) throw new Error("expected a created order, got a conflict");
    const orderId = cookieOrderId;

    const updated = await saveDraft(created.updatedAt, { registrant: validPerson({ first: "Updated" }), companions: [] });
    if ("conflict" in updated) throw new Error("expected an update, got a conflict");

    expect(cookieOrderId).toBe(orderId);
    expect(setOrderCookie).toHaveBeenCalledTimes(1);
    const order = await db.getOrder(orderId!);
    expect(order!.people[0]?.first).toBe("Updated");
  });

  it("reports a conflict instead of overwriting a newer save", async () => {
    const created = await saveDraft(null, { registrant: validPerson(), companions: [] });
    if ("conflict" in created) throw new Error("expected a created order, got a conflict");
    await saveDraft(created.updatedAt, { registrant: validPerson({ first: "FirstWriter" }), companions: [] });

    const staleWrite = await saveDraft(created.updatedAt, { registrant: validPerson({ first: "StaleWriter" }), companions: [] });

    expect("conflict" in staleWrite).toBe(true);
  });

  it("reports a conflict when the client has saved before but the browser has no order cookie", async () => {
    const created = await saveDraft(null, { registrant: validPerson(), companions: [] });
    if ("conflict" in created) throw new Error("expected a created order, got a conflict");
    cookieOrderId = undefined;

    const result = await saveDraft(created.updatedAt, { registrant: validPerson(), companions: [] });

    expect("conflict" in result).toBe(true);
  });

  it("reports a conflict instead of creating a second order when the browser already has one", async () => {
    await saveDraft(null, { registrant: validPerson({ first: "OtherTab" }), companions: [] });
    const orderId = cookieOrderId;

    const result = await saveDraft(null, { registrant: validPerson({ first: "ThisTab" }), companions: [] });

    expect("conflict" in result).toBe(true);
    expect(cookieOrderId).toBe(orderId);
    const order = await db.getOrder(orderId!);
    expect(order!.people[0]?.first).toBe("OtherTab");
  });

  it("creates a new order when the cookie names an order that no longer exists", async () => {
    await saveDraft(null, { registrant: validPerson(), companions: [] });
    const deletedId = cookieOrderId!;
    await service.from("orders").delete().eq("id", deletedId);

    const result = await saveDraft(null, { registrant: validPerson(), companions: [] });

    expect("conflict" in result).toBe(false);
    expect(cookieOrderId).not.toBe(deletedId);
  });

  it("doesn't write once registration is no longer open", async () => {
    await updateTenantConfig(service, tenantId, { registration_config: { ...defaultRegistrationConfig(), opening: "closed" } });

    const result = await saveDraft(null, { registrant: validPerson(), companions: [] });

    expect("conflict" in result).toBe(true);
    expect(cookieOrderId).toBeUndefined();
  });
});

describe("submitRegistration", () => {
  // redirect() throws (by design, in real Next.js code) rather than returning -- the success path
  // is covered through this, not by inspecting a resolved value.
  it("confirms the order and throws to redirect, for a pay-mode tenant", async () => {
    const created = await saveDraft(null, { registrant: validPerson(), companions: [] });
    if ("conflict" in created) throw new Error("expected a created order, got a conflict");

    await expect(submitRegistration(created.updatedAt, { registrant: validPerson(), companions: [] })).rejects.toThrow();

    const order = await db.getOrder(cookieOrderId!);
    expect(order!.registered_at).not.toBeNull();
    expect(order!.submission_mode).toBe("pay");
  });

  it("records a lottery-mode tenant's order as lottery", async () => {
    await updateTenantConfig(service, tenantId, { registration_config: { ...defaultRegistrationConfig(), opening: "now", mode: "lottery" } });
    const created = await saveDraft(null, { registrant: validPerson(), companions: [] });
    if ("conflict" in created) throw new Error("expected a created order, got a conflict");

    await expect(submitRegistration(created.updatedAt, { registrant: validPerson(), companions: [] })).rejects.toThrow();

    const order = await db.getOrder(cookieOrderId!);
    expect(order!.submission_mode).toBe("lottery");
  });

  it("creates the order itself if autosave never fired", async () => {
    // A distinct name, not the plain id lookup other tests use, since submitRegistration doesn't
    // return the id it creates on this path (it redirects instead of resolving).
    await expect(submitRegistration(null, { registrant: validPerson({ first: "NeverAutosaved" }), companions: [] })).rejects.toThrow();

    const { data } = await service.from("orders").select("people, registered_at").eq("tenant_id", tenantId).not("registered_at", "is", null);
    const created = data!.filter((order) => (order.people as Person[])[0]?.first === "NeverAutosaved");
    expect(created).toHaveLength(1);
  });

  it("reports a conflict instead of confirming based on a stale updatedAt", async () => {
    const created = await saveDraft(null, { registrant: validPerson(), companions: [] });
    if ("conflict" in created) throw new Error("expected a created order, got a conflict");
    await saveDraft(created.updatedAt, { registrant: validPerson({ first: "FirstWriter" }), companions: [] });

    const result = await submitRegistration(created.updatedAt, { registrant: validPerson({ first: "StaleWriter" }), companions: [] });

    expect(result).toEqual({ conflict: true });
  });

  it("refuses once registration is no longer open", async () => {
    const created = await saveDraft(null, { registrant: validPerson(), companions: [] });
    if ("conflict" in created) throw new Error("expected a created order, got a conflict");
    await updateTenantConfig(service, tenantId, { registration_config: { ...defaultRegistrationConfig(), opening: "closed" } });

    const result = await submitRegistration(created.updatedAt, { registrant: validPerson(), companions: [] });

    expect(result).toMatchObject({ error: expect.any(String) });
  });

  it("refuses values that don't pass strict validation", async () => {
    const result = await submitRegistration(null, { registrant: validPerson({ email: "" }), companions: [] });

    expect(result).toMatchObject({ error: expect.any(String) });
  });
});
