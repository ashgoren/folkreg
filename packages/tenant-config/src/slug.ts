// A tenant's slug is its registration site's hostname, {slug}.folkreg.org, so it has to be a valid
// DNS label and can't be a name the platform uses itself. The same rules are a check constraint on
// tenants.slug (migration tenants_slug_valid); a @repo/db test checks the two lists agree.

import { z } from "zod";

export const RESERVED_SLUGS = [
  "www", "admin", "api", "app", "mail", "smtp", "status", "docs", "help", "support", "blog",
  "staging", "preview", "assets", "static", "cdn",
] as const;

// A DNS label: lowercase letters, digits, and hyphens, 1-63 long, not starting or ending with a hyphen.
export const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

// Checked one rule at a time so the message says which one a slug breaks.
export const slugSchema = z.string()
  .min(1, { error: "Required" })
  .regex(/^[a-z0-9-]*$/, { error: "Lowercase letters, numbers, and hyphens only" })
  .refine((slug) => !slug.startsWith("-") && !slug.endsWith("-"), { error: "Can't start or end with a hyphen" })
  .max(63, { error: "63 characters at most" })
  .refine((slug) => !(RESERVED_SLUGS as readonly string[]).includes(slug), { error: "That name is reserved" });
