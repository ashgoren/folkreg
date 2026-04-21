import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantByOwner } from "@/lib/tenant";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const tenant = await getTenantByOwner(supabase, user.id);
  if (!tenant) redirect("/auth/login");

  redirect(`/dashboard/${tenant.id}/general`);
}
