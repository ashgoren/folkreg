import { cache } from "react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createServiceRoleClient } from "@repo/db/server";
import { createTenantDb } from "@repo/db/queries";

// The tenant this request is for, from the x-tenant-id header proxy.ts sets once it has resolved
// the subdomain. The header can be trusted because the proxy sets it on every request it lets
// through, replacing any value the browser sent, and answers 404 itself when no tenant matches.
// Wrapped in React's cache(), so the layout, its metadata, and the page share one lookup per request.
export const getRequestTenant = cache(async () => {
  const tenantId = (await headers()).get("x-tenant-id");
  if (!tenantId) throw new Error("No x-tenant-id header: this route isn't covered by proxy.ts's matcher");

  const db = createTenantDb(createServiceRoleClient(), tenantId);
  const tenant = await db.getTenant();
  if (!tenant) notFound(); // This should never happen because the proxy already 404s if the subdomain doesn't match a tenant.
  return { db, tenant };
});
