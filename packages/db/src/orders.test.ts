import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Person } from "@repo/types";
import { createTestClient, getTestTenantId } from "./test-helpers";
import { createTenantDb } from "./queries";

const EVENT_YEAR = 2026;

const testPerson = (overrides: Partial<Person> = {}): Person => ({
  first: "Test",
  last: "Person",
  email: "test@example.com",
  phone: "555-0100",
  admission: 50,
  ...overrides,
});

describe("order methods (via createTenantDb)", () => {
  const supabase = createTestClient();
  let tenantId: string;
  let orders: ReturnType<typeof createTenantDb>;

  beforeAll(async () => {
    tenantId = await getTestTenantId(supabase);
    orders = createTenantDb(supabase, tenantId);
  });

  afterAll(async () => {
    await supabase.from("orders").delete().eq("tenant_id", tenantId);
  });

  it("creates an order with sensible defaults", async () => {
    const { id, updatedAt } = await orders.createOrder([testPerson()], false, EVENT_YEAR);
    expect(id).toBeTruthy();
    expect(updatedAt).toBeTruthy();

    const order = await orders.getOrder(id);
    expect(order).not.toBeNull();
    expect(order!.people).toEqual([testPerson()]);
    expect(order!.is_test).toBe(false);
    expect(order!.event_year).toBe(EVENT_YEAR);
    expect(order!.registered_at).toBeNull();
    expect(order!.payments).toEqual([]);
    expect(order!.lottery).toBeNull();
  });

  it("records a test order as one", async () => {
    const { id } = await orders.createOrder([testPerson()], true, EVENT_YEAR);
    expect((await orders.getOrder(id))!.is_test).toBe(true);
  });

  // Tried on insert: on update, the set_updated_at trigger would replace a null updated_at with
  // now() before the constraint is checked. The cast gets past the generated types, which don't
  // allow null here, so this checks the database constraint itself. Any row it does create is
  // removed by afterAll.
  it.each(["created_at", "updated_at"])("rejects a null %s", async (column) => {
    const { error } = await supabase.from("orders").insert({ tenant_id: tenantId, event_year: EVENT_YEAR, [column]: null } as never);
    expect(error).toMatchObject({ code: "23502" }); // not_null_violation
  });

  it("returns null for an order that doesn't exist", async () => {
    const order = await orders.getOrder("00000000-0000-0000-0000-000000000000");
    expect(order).toBeNull();
  });

  it("updates people and advances updated_at", async () => {
    const created = await orders.createOrder([testPerson()], false, EVENT_YEAR);
    const updatedPeople = [testPerson({ first: "Updated" })];

    const result = await orders.updateOrderPeople(created.id, updatedPeople, created.updatedAt);
    expect(result).not.toBeNull();
    expect(result!.updatedAt).not.toBe(created.updatedAt);

    const order = await orders.getOrder(created.id);
    expect(order!.people).toEqual(updatedPeople);
  });

  it("refuses to apply an update based on a stale updated_at", async () => {
    const created = await orders.createOrder([testPerson()], false, EVENT_YEAR);

    // Simulate another writer (e.g. a second tab sharing the same draft) updating first.
    const firstWrite = await orders.updateOrderPeople(created.id, [testPerson({ first: "FirstWriter" })], created.updatedAt);
    expect(firstWrite).not.toBeNull();

    // This caller still thinks the order is at its original updatedAt -- its write must be rejected.
    const staleWrite = await orders.updateOrderPeople(created.id, [testPerson({ first: "StaleWriter" })], created.updatedAt);
    expect(staleWrite).toBeNull();

    const order = await orders.getOrder(created.id);
    expect(order!.people[0]?.first).toBe("FirstWriter"); // the stale write never applied
  });

  it("sets registered_at on confirmation, and leaves it untouched on a repeat confirmation", async () => {
    const created = await orders.createOrder([testPerson()], false, EVENT_YEAR);
    await orders.confirmRegistration(created.id);

    const confirmed = await orders.getOrder(created.id);
    expect(confirmed!.registered_at).not.toBeNull();

    await orders.confirmRegistration(created.id); // resubmitting shouldn't move the timestamp
    const confirmedAgain = await orders.getOrder(created.id);
    expect(confirmedAgain!.registered_at).toBe(confirmed!.registered_at);
  });
});
