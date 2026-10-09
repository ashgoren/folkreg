import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantByOwner } from "@/lib/tenant";
import { logout } from "@/app/auth/logout/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const tenant = await getTenantByOwner(supabase, user.id);
  if (tenant) redirect(`/dashboard/${tenant.id}/general`);

  // A logged-in user who owns no tenant: tenants are created for organizers by hand, so this is an
  // account that hasn't been set up yet (or the wrong account). Sending them to the login page
  // would only show the login form again, so this says what happened and offers a way to switch
  // accounts.
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>No event set up</CardTitle>
          <CardDescription>
            {user.email} isn&rsquo;t connected to an event yet. If you expected to see one, contact the
            folkreg administrator, or log out and sign in with a different account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logout}>
            <Button type="submit" variant="outline" className="w-full">Log out</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
