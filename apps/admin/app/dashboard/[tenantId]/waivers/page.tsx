import { getPageTenant } from "@/lib/tenant";
import { WaiversForm } from "./WaiversForm";

export default async function WaiversPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { db, tenant } = await getPageTenant(tenantId);
  const secrets = await db.getSecrets();

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-8">Waivers</h1>
      <WaiversForm tenant={tenant} secrets={secrets} />
    </div>
  );
}
