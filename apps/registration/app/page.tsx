import { registrationStatus } from "@repo/tenant-config";
import { ClosedPage } from "@/components/closed-page";
import { getRequestTenant } from "@/lib/tenant";
import { getOrderFromCookie } from "@/lib/order-session";
import { parseSavedOrder } from "./registration-party";
import { RegistrationForm } from "./RegistrationForm";

export default async function RegistrationPage() {
  const { tenant } = await getRequestTenant();
  const { timezone, links } = tenant.event_config;

  const status = registrationStatus({
    registration: tenant.registration_config,
    timezone,
    now: new Date(),
    peopleRegistered: null, // TEMPORARY until orders record the year of the event they belong to
  });

  if (status.state !== "open") {
    return <ClosedPage status={status} timezone={timezone} websiteUrl={links.info} />;
  }

  const order = await getOrderFromCookie();

  return (
    <RegistrationForm
      fieldsConfig={tenant.fields_config}
      waiverConfig={tenant.waiver_config}
      initialOrder={order ? parseSavedOrder(order) : null}
    />
  );
}
