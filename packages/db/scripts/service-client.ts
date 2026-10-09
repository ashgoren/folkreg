import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database, DbClient } from "@repo/types";

// Loads SUPABASE_URL / SUPABASE_SECRET_KEY from an env file and returns a service-role client for
// it, plus the URL so callers can check or print what they're about to write to. `envFile` is
// relative to packages/db; it's resolved from this file's location (scripts/, hence the `../`) so
// it works whatever directory the script is run from.
export const loadServiceClient = (envFile: string): { service: DbClient; url: string } => {
  config({ path: fileURLToPath(new URL(`../${envFile}`, import.meta.url)), quiet: true });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error(`SUPABASE_URL and SUPABASE_SECRET_KEY must be set in packages/db/${envFile}`);
  const service = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return { service, url };
};
