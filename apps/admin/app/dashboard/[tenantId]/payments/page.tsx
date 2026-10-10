import { getPageTenant } from "@/lib/tenant";
import { secretValues } from "@/lib/secret-values";
import { PaymentsForm } from "./PaymentsForm";
import { paymentSecretsSchema } from "./schema";

export default async function PaymentsPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { db, tenant } = await getPageTenant(tenantId);
  // Only the secrets this page edits reach the browser.
  const secrets = secretValues(paymentSecretsSchema, await db.getSecrets());

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-8">Payments</h1>
      <PaymentsForm tenant={tenant} secrets={secrets} />
    </div>
  );
}
