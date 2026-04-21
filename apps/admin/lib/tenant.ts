import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { DbClient } from "@repo/types";

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

