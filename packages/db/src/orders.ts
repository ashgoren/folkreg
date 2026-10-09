import type { DbClient, Json, Order, Person } from "@repo/types";

export const createOrderMethods = (supabase: DbClient, tenantId: string) => {
  const createOrder = async (people: Person[], isLive: boolean): Promise<{ id: string; updatedAt: string }> => {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        people: people as unknown as Json,
        is_live: isLive,
      })
      .select("id, updated_at")
      .single();
    if (error) throw error;
    return { id: data.id, updatedAt: data.updated_at };
  };

  const getOrder = async (orderId: string): Promise<Order | null> => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("tenant_id", tenantId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null; // No row found
      throw error; // Unexpected error
    }
    // getTenant's equivalent cast (queries.ts) is a plain `as Tenant` -- that works there because
    // every jsonb column it narrows is a single object. Here, `people`/`payments` narrow jsonb
    // columns to *arrays* (Person[]/Payment[]), and TS's "as" cast rejects an object-vs-array
    // mismatch as insufficiently overlapping, hence the extra `unknown` hop.
    return data as unknown as Order;
  };

  // Returns null if some other writer (e.g. another tab sharing the same draft via the order
  // cookie) has updated this order since expectedUpdatedAt was read, instead of blindly applying
  // a write that would silently clobber those newer changes.
  const updateOrderPeople = async (
    orderId: string,
    people: Person[],
    expectedUpdatedAt: string
  ): Promise<{ updatedAt: string } | null> => {
    const { data, error } = await supabase
      .from("orders")
      .update({ people: people as unknown as Json })
      .eq("id", orderId)
      .eq("tenant_id", tenantId)
      .eq("updated_at", expectedUpdatedAt)
      .select("updated_at")
      .single();
    if (error) {
      if (error.code === "PGRST116") return null; // No row matched -- conflicting write happened elsewhere
      throw error;
    }
    return { updatedAt: data.updated_at };
  };

  // Only sets registered_at if it isn't already set, so resubmitting a confirmed
  // registration doesn't overwrite the original confirmation timestamp.
  const confirmRegistration = async (orderId: string): Promise<void> => {
    const { error } = await supabase
      .from("orders")
      .update({ registered_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("tenant_id", tenantId)
      .is("registered_at", null);
    if (error) throw error;
  };

  return { createOrder, getOrder, updateOrderPeople, confirmRegistration };
};
