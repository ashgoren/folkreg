import type { DbClient, Json, Order, Person } from "@repo/types";
import type { RegistrationConfig } from "@repo/tenant-config";

export const createOrderMethods = (supabase: DbClient, tenantId: string) => {
  // isTest is required rather than defaulted, so every caller decides it on purpose: a test order
  // pays with the test keys, so it must come from a server-verified preview session. eventYear is
  // required too -- which year's event this order belongs to, since a tenant reuses the same row
  // across years and counts (closeAfter, waitlistAfter) must count only the current one.
  //
  // submissionMode is what submissionMode() resolved at submit, and decides registered_at in the same
  // insert: a lottery or waitlist entry is the registration itself, so it's registered now; a pay-mode
  // order stays pending (registered_at null), uncounted and editable, until its first payment.
  const createOrder = async ({ people, isTest, eventYear, submissionMode }: {
    people: Person[];
    isTest: boolean;
    eventYear: number;
    submissionMode: RegistrationConfig["mode"];
  }): Promise<{ id: string }> => {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        tenant_id: tenantId,
        people: people as unknown as Json,
        is_test: isTest,
        event_year: eventYear,
        submission_mode: submissionMode,
        registered_at: submissionMode === "pay" ? null : new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: data.id };
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
    // The jsonb columns come back as generic Json. `people`/`payments` narrow to arrays
    // (Person[]/Payment[]), which TS's "as" rejects as insufficiently overlapping with Json, hence
    // the `unknown` hop.
    return data as unknown as Order;
  };

  // Counts people on registered, live orders for one event year -- what registrationStatus and
  // submissionMode both need as peopleRegistered: every lottery and waitlist entry, and pay-mode
  // orders once paid. A pending pay-mode order (an unfinished or abandoned checkout) holds no spot.
  const countRegisteredPeople = async (eventYear: number): Promise<number> => {
    const { data, error } = await supabase
      .from("orders")
      .select("people")
      .eq("tenant_id", tenantId)
      .eq("event_year", eventYear)
      .eq("is_test", false)
      .not("registered_at", "is", null);
    if (error) throw error;

    return data.reduce((total, order) => total + (order.people as unknown as Person[]).length, 0);
  };

  return { createOrder, getOrder, countRegisteredPeople };
};
