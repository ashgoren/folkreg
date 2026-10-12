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
    expect(order!.submission_mode).toBeNull();
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

  it.each(["pay", "waitlist", "lottery"] as const)("records submission_mode as '%s' on confirmation", async (mode) => {
    const created = await orders.createOrder([testPerson()], false, EVENT_YEAR);
    await orders.confirmRegistration(created.id, mode);

    const order = await orders.getOrder(created.id);
    expect(order!.submission_mode).toBe(mode);
  });

  it("sets registered_at on confirmation, and leaves it and submission_mode untouched on a repeat confirmation", async () => {
    const created = await orders.createOrder([testPerson()], false, EVENT_YEAR);
    await orders.confirmRegistration(created.id, "pay");

    const confirmed = await orders.getOrder(created.id);
    expect(confirmed!.registered_at).not.toBeNull();
    expect(confirmed!.submission_mode).toBe("pay");

    // Resubmitting shouldn't move the timestamp or let a different mode overwrite the original one.
    await orders.confirmRegistration(created.id, "lottery");
    const confirmedAgain = await orders.getOrder(created.id);
    expect(confirmedAgain!.registered_at).toBe(confirmed!.registered_at);
    expect(confirmedAgain!.submission_mode).toBe("pay");
  });

  // Its own event year, not EVENT_YEAR -- other tests in this file confirm orders under EVENT_YEAR
  // too, which would make an aggregate count order-dependent on what else has run.
  describe("countRegisteredPeople", () => {
    const COUNT_EVENT_YEAR = 2099;

    it("counts people on confirmed, live orders for the given event year", async () => {
      await orders.createOrder([testPerson(), testPerson({ last: "Two" })], false, COUNT_EVENT_YEAR); // draft, never confirmed

      const pay = await orders.createOrder([testPerson()], false, COUNT_EVENT_YEAR);
      await orders.confirmRegistration(pay.id, "pay");

      const waitlist = await orders.createOrder([testPerson(), testPerson({ last: "Two" }), testPerson({ last: "Three" })], false, COUNT_EVENT_YEAR);
      await orders.confirmRegistration(waitlist.id, "waitlist");

      const lottery = await orders.createOrder([testPerson(), testPerson({ last: "Two" })], false, COUNT_EVENT_YEAR);
      await orders.confirmRegistration(lottery.id, "lottery");

      const test = await orders.createOrder([testPerson({ last: "Test1" }), testPerson({ last: "Test2" })], true, COUNT_EVENT_YEAR);
      await orders.confirmRegistration(test.id, "pay");

      const otherYear = await orders.createOrder([testPerson()], false, COUNT_EVENT_YEAR + 1);
      await orders.confirmRegistration(otherYear.id, "pay");

      // draft (never confirmed), the test order, and the other year's order are all excluded;
      // every mode counts: pay (1) + waitlist (3) + lottery (2) = 6.
      expect(await orders.countRegisteredPeople(COUNT_EVENT_YEAR)).toBe(6);
    });
  });
});
