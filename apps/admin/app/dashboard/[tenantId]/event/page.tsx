import { getPageTenant } from "@/lib/tenant";
import { EventForm } from "./EventForm";

export default async function EventPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { tenant } = await getPageTenant(tenantId);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-8">Event</h1>
      <EventForm tenant={tenant} tenantId={tenantId} />
    </div>
  );
}
