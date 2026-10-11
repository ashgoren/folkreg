import { slugSchema } from "@repo/tenant-config";

/**
 * The tenant slug a request's Host header names: the first label of `{slug}.folkreg.org` (or
 * `{slug}.localhost:3000` locally). null when the host has no subdomain, or its first label couldn't
 * be any tenant's slug (a reserved name like `www`, or not a valid DNS label), so the proxy can
 * answer 404 without looking anything up. Checked with slugSchema, the same rules a slug is saved
 * under, so what counts as a possible tenant is defined in one place.
 */
export const slugFromHost = (host: string): string | null => {
  const hostname = host.split(":")[0]!.toLowerCase();
  const labels = hostname.split(".");
  if (labels.length < 2) return null;

  const slug = labels[0]!;
  return slugSchema.safeParse(slug).success ? slug : null;
};
