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

  it("creates a pay-mode order pending, with sensible defaults", async () => {
    const { id } = await orders.createOrder({ people: [testPerson()], isTest: false, eventYear: EVENT_YEAR, submissionMode: "pay" });
    expect(id).toBeTruthy();

    const order = await orders.getOrder(id);
    expect(order).not.toBeNull();
    expect(order!.people).toEqual([testPerson()]);
    expect(order!.is_test).toBe(false);
    expect(order!.event_year).toBe(EVENT_YEAR);
    expect(order!.registered_at).toBeNull();
    expect(order!.payments).toEqual([]);
    expect(order!.submission_mode).toBe("pay");
  });

  // The entry is the registration itself, so it's registered (and counted) as soon as it's created.
  it.each(["waitlist", "lottery"] as const)("creates a %s entry already registered", async (mode) => {
    const { id } = await orders.createOrder({ people: [testPerson()], isTest: false, eventYear: EVENT_YEAR, submissionMode: mode });

    const order = await orders.getOrder(id);
    expect(order!.submission_mode).toBe(mode);
    expect(order!.registered_at).not.toBeNull();
  });

  it("records a test order as one", async () => {
    const { id } = await orders.createOrder({ people: [testPerson()], isTest: true, eventYear: EVENT_YEAR, submissionMode: "pay" });
    expect((await orders.getOrder(id))!.is_test).toBe(true);
  });

  // Tried on insert: on update, the set_updated_at trigger would replace a null updated_at with
  // now() before the constraint is checked. The cast gets past the generated types, which don't
  // allow null here, so this checks the database constraint itself. Any row it does create is
  // removed by afterAll.
  it.each(["created_at", "updated_at"])("rejects a null %s", async (column) => {
    const { error } = await supabase.from("orders").insert({ tenant_id: tenantId, event_year: EVENT_YEAR, submission_mode: "pay", [column]: null } as never);
    expect(error).toMatchObject({ code: "23502" }); // not_null_violation
  });

  it("rejects an order with no submission_mode", async () => {
    const { error } = await supabase.from("orders").insert({ tenant_id: tenantId, event_year: EVENT_YEAR } as never);
    expect(error).toMatchObject({ code: "23502" }); // not_null_violation
  });

  it("rejects a submission_mode that isn't pay, waitlist, or lottery", async () => {
    const { error } = await supabase.from("orders").insert({ tenant_id: tenantId, event_year: EVENT_YEAR, submission_mode: "draft" });
    expect(error).toMatchObject({ code: "23514" }); // check_violation
  });

  it("returns null for an order that doesn't exist", async () => {
    const order = await orders.getOrder("00000000-0000-0000-0000-000000000000");
    expect(order).toBeNull();
  });

  // Its own event year, not EVENT_YEAR -- other tests in this file register orders under EVENT_YEAR
  // too, which would make an aggregate count order-dependent on what else has run.
  describe("countRegisteredPeople", () => {
    const COUNT_EVENT_YEAR = 2099;

    it("counts people on registered, live orders for the given event year", async () => {
      const create = (people: Person[], submissionMode: "pay" | "waitlist" | "lottery", overrides: { isTest?: boolean; eventYear?: number } = {}) =>
        orders.createOrder({ people, submissionMode, isTest: overrides.isTest ?? false, eventYear: overrides.eventYear ?? COUNT_EVENT_YEAR });

      await create([testPerson(), testPerson({ last: "Two" })], "pay"); // pending: never paid

      // Stands in for a first payment, which is what registers a pay-mode order; nothing else in
      // this package does that yet.
      const paid = await create([testPerson()], "pay");
      await supabase.from("orders").update({ registered_at: new Date().toISOString() }).eq("id", paid.id);

      await create([testPerson(), testPerson({ last: "Two" }), testPerson({ last: "Three" })], "waitlist");
      await create([testPerson(), testPerson({ last: "Two" })], "lottery");
      await create([testPerson({ last: "Test1" }), testPerson({ last: "Test2" })], "waitlist", { isTest: true });
      await create([testPerson()], "waitlist", { eventYear: COUNT_EVENT_YEAR + 1 });

      // the pending pay order, the test order, and the other year's order are all excluded; every
      // mode counts once registered: paid (1) + waitlist (3) + lottery (2) = 6.
      expect(await orders.countRegisteredPeople(COUNT_EVENT_YEAR)).toBe(6);
    });
  });
});
