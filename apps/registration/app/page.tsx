import { eventYear, registrationStatus } from "@repo/tenant-config";
import { ClosedPage } from "@/components/closed-page";
import { getRequestTenant } from "@/lib/tenant";
import { RegistrationForm } from "./RegistrationForm";

export default async function RegistrationPage() {
  const { db, tenant } = await getRequestTenant();
  const { timezone, links } = tenant.event_config;
  const year = eventYear(tenant.event_config) ?? new Date().getFullYear();

  const status = registrationStatus({
    registration: tenant.registration_config,
    timezone,
    now: new Date(),
    peopleRegistered: await db.countRegisteredPeople(year),
  });

  if (status.state !== "open") {
    return <ClosedPage status={status} timezone={timezone} websiteUrl={links.info} />;
  }

  return (
    <RegistrationForm
      fieldsConfig={tenant.fields_config}
      waiverConfig={tenant.waiver_config}
    />
  );
}
