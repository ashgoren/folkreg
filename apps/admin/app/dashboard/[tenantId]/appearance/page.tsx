import { getPageTenant } from "@/lib/tenant";
import { AppearanceForm } from "./AppearanceForm";

export default async function AppearancePage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { tenant } = await getPageTenant(tenantId);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-8">Appearance</h1>
      <AppearanceForm tenant={tenant} tenantId={tenantId} />
    </div>
  );
}
