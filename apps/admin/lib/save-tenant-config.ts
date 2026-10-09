// The shared body of every config page's server action: validate, check the session, write
// through the tenant-scoped accessor, and turn the expected failures into a message for the
// autosave toast.
//
// Deliberately not a "use server" module. Every export of one becomes a public endpoint, and this
// takes a write function, which isn't something a client could (or should) send. Each page's
// actions.ts stays the endpoint and supplies its own write. Importing @/lib/supabase/server (which
// imports next/headers) already keeps this out of client bundles.

import type { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import { TenantNotFoundError } from "@repo/db/errors";

export type TenantDb = ReturnType<typeof createTenantDb>;

// `values` is unknown, not the page's config type: a server action can be called with any
// arguments, not just what the page's form sends, so the schema parse is the only real check on
// it. `write` gets the parsed data (with any schema transforms applied) and returns an error
// message for a failure specific to its page, e.g. General's taken slug.
export async function saveTenantConfig<T>(
  tenantId: string,
  schema: z.ZodType<T>,
  values: unknown,
  write: (db: TenantDb, data: T) => Promise<string | void>,
): Promise<string | null> {
  const parsed = schema.safeParse(values);
  if (!parsed.success) return "Invalid data";

  // getClaims() verifies the session's JWT locally when the project signs with asymmetric keys (falling back to asking the Auth server otherwise);
  // PostgREST also only verifies the JWT before applying RLS. This check is for the clearer message; RLS is what actually blocks a logged-out write.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return "Not authenticated";

  try {
    return (await write(createTenantDb(supabase, tenantId), parsed.data)) ?? null;
  } catch (error: unknown) {
    // A wrong id, or (under RLS) a tenant this user doesn't own.
    if (error instanceof TenantNotFoundError) return "No tenant found";
    throw error;
  }
}
