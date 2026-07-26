import { getPageTenant } from "@/lib/tenant";
import { AdmissionsForm } from "./AdmissionsForm";

export default async function AdmissionsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { tenant } = await getPageTenant(tenantId);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-8">Admissions</h1>
      <AdmissionsForm tenant={tenant} />
    </div>
  );
}
