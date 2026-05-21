import { getPageTenant } from "@/lib/tenant";
import { FieldsForm } from "./FieldsForm";

export default async function FieldsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { tenant } = await getPageTenant(tenantId);
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-8">Fields</h1>
      <FieldsForm tenant={tenant} tenantId={tenantId} />
    </div>
  );
}
