import { getPageTenant } from "@/lib/tenant";
import { PaymentsForm } from "./PaymentsForm";

export default async function PaymentsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { db, tenant } = await getPageTenant(tenantId);
  const secrets = await db.getSecrets();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-8">Payments</h1>
      <PaymentsForm tenant={tenant} secrets={secrets} />
    </div>
  );
}
