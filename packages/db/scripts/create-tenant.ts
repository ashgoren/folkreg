// Creates an organizer account and the tenant it owns, with the default config:
//
//   pnpm create-tenant --slug my-event --email organizer@example.org --password '...'
//
// Targets the Supabase in packages/db/.env.test.local (local) unless --env names another env
// file in packages/db, e.g. a gitignored .env.production.local. A non-local target also needs
// --yes, so a production write is never the result of a forgotten flag.

import { parseArgs } from "node:util";
import { createTenantWithOwner } from "../src/provisioning";
import { isLocalUrl } from "../src/local-url";
import { loadServiceClient } from "./service-client";

const { values } = parseArgs({
  options: {
    slug: { type: "string" },
    email: { type: "string" },
    password: { type: "string" },
    env: { type: "string", default: ".env.test.local" },
    yes: { type: "boolean", default: false },
  },
});

const { slug, email, password, env, yes } = values;
if (!slug || !email || !password) {
  console.error("Usage: pnpm create-tenant --slug <slug> --email <email> --password <password> [--env <file>] [--yes]");
  process.exit(1);
}

const { service, url } = loadServiceClient(env);
if (!isLocalUrl(url) && !yes) {
  console.error(`${url} isn't local Supabase. Re-run with --yes to create the tenant there.`);
  process.exit(1);
}

try {
  const { userId, tenantId } = await createTenantWithOwner(service, { slug, email, password });
  console.log(`Created tenant "${slug}" (${tenantId}) owned by ${email} (${userId}) on ${url}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
