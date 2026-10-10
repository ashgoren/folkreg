import { getPageTenant } from "@/lib/tenant";
import { secretValues } from "@/lib/secret-values";
import { WaiversForm } from "./WaiversForm";
import { waiverSecretsSchema } from "./schema";

export default async function WaiversPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { db, tenant } = await getPageTenant(tenantId);
  // Only the secrets this page edits reach the browser.
  const secrets = secretValues(waiverSecretsSchema, await db.getSecrets());

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-8">Waivers</h1>
      <WaiversForm tenant={tenant} secrets={secrets} />
    </div>
  );
}
