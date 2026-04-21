import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { getRequestUser } from "@/lib/tenant";

export default async function TenantDashboardLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  if (!z.uuid().safeParse(tenantId).success) notFound();

  const user = await getRequestUser();
  if (!user) redirect("/auth/login");

  return (
    <SidebarProvider>
      <AppSidebar userEmail={user.email ?? ""} tenantId={tenantId} />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
