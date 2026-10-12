import { cache } from "react";
import { cookies } from "next/headers";
import { getRequestTenant } from "./tenant";

export const ORDER_COOKIE = "orderId";

// Not readable by client JS - the client tracks { orderId, updatedAt } in its own state instead,
// seeded from this page's initial render, which already needs the order's full data to resume a draft.
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  // eslint-disable-next-line turbo/no-undeclared-env-vars -- NODE_ENV is always in turbo's cache hash
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days - long enough to close the tab and come back later
} as const;

// Whether this visitor has an in-progress registration, and what's in it - no gating logic here:
// callers decide what a draft vs. a confirmed order means for them. null covers both no cookie and a
// cookie whose order no longer exists or belongs to a different tenant (getOrder's own tenant_id
// scoping handles that second case for free).
export const getOrderFromCookie = cache(async () => {
  const orderId = (await cookies()).get(ORDER_COOKIE)?.value;
  if (!orderId) return null;

  const { db } = await getRequestTenant();
  return db.getOrder(orderId);
});

export const setOrderCookie = async (orderId: string) => {
  (await cookies()).set(ORDER_COOKIE, orderId, COOKIE_OPTIONS);
};
