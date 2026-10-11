import { getPageTenant } from "@/lib/tenant";
import { RegistrationForm } from "./RegistrationForm";

// The moment the page is rendered, which the summary of whether registration is open is worked out
// for. Read here on the server and passed down, so the server render and the browser's hydration
// agree on it; the summary is as of page load, like the rest of the page.
const renderedAt = () => Date.now();

export default async function RegistrationPage({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { tenant } = await getPageTenant(tenantId);

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold mb-8">Registration</h1>
      <RegistrationForm tenant={tenant} now={renderedAt()} />
    </div>
  );
}
