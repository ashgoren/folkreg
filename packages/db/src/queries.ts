import type { DbClient } from "./server.ts";

export const getTenantByDomain = async (supabase: DbClient, domain: string) => {
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("domain", domain)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // No row found
    throw error; // Unexpected error
  }
  return data;
};
