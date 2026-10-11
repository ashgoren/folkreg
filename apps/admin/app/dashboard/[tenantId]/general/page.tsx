import { getPageTenant } from "@/lib/tenant";
import { SlugSetting } from "./SlugSetting";

export default async function GeneralPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { tenant } = await getPageTenant(tenantId);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-8">General</h1>
      <SlugSetting tenantId={tenant.id} initialSlug={tenant.slug} />
    </div>
  );
}
