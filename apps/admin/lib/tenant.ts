import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTenantDb } from "@repo/db/queries";
import type { DbClient } from "@repo/types";

// lookup tenant by user id (used to redirect to correct tenant dashboard)
export const getTenantByOwner = async (supabase: DbClient, ownerId: string) => {
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("owner_id", ownerId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
};

export const getRequestUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

// wrapper to fetch db & tenant for page components
export const getPageTenant = cache(async (tenantId: string) => {
  const supabase = await createClient();
  const db = createTenantDb(supabase, tenantId);
  const tenant = await db.getTenant();
  if (!tenant) notFound();
  return { db, tenant };
});
