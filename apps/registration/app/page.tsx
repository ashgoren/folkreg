import { headers } from "next/headers";

export default async function Home() {
  const h = await headers();
  const tenantId = h.get("x-tenant-id");

  return <p>{tenantId ?? "tenant not found"}</p>;
}
