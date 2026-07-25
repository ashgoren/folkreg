import { getPageTenant } from "@/lib/tenant";
import { SpreadsheetForm } from "./SpreadsheetForm";

export default async function SpreadsheetPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { tenant } = await getPageTenant(tenantId);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-8">Spreadsheet</h1>
      <SpreadsheetForm tenant={tenant} />
    </div>
  );
}
