// Creating tenants and their owners. Inserting tenants and managing auth users are both
// service-role operations (tenants has no insert policy, and auth.admin requires the secret key),
// so every function here takes a service-role client. No `server-only` import: the seed and
// create-tenant scripts call these from plain Node.

import { defaultTenantConfig } from "@repo/tenant-config";
import type { DbClient } from "@repo/types";
import { getTenantBySlug } from "./queries";

// Inserts a tenant with the full default config. The tenants_create_secrets trigger adds its
// tenant_secrets row in the same statement.
export const createTenant = async (
  service: DbClient,
  { slug, ownerId }: { slug: string; ownerId: string | null },
): Promise<string> => {
  const { data, error } = await service
    .from("tenants")
    .insert({ slug, owner_id: ownerId, ...defaultTenantConfig() })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
};

// Creates a confirmed email/password user and a tenant they own. The two steps can't share a
// transaction -- the user is created through the Supabase Auth API, the tenant by a Postgres
// insert -- so a failed insert is undone by deleting the user again, rather than leaving behind
// an account with no tenant.
export const createTenantWithOwner = async (
  service: DbClient,
  { slug, email, password }: { slug: string; email: string; password: string },
): Promise<{ userId: string; tenantId: string }> => {
  // A taken slug is the likeliest failure, and checking first avoids creating a user only to
  // delete it. The unique constraint still catches a slug taken between this check and the insert.
  if (await getTenantBySlug(service, slug)) throw new Error(`Slug "${slug}" is already taken`);

  const { data, error } = await service.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const userId = data.user.id;

  try {
    const tenantId = await createTenant(service, { slug, ownerId: userId });
    return { userId, tenantId };
  } catch (insertError) {
    const { error: cleanupError } = await service.auth.admin.deleteUser(userId);
    if (cleanupError) {
      throw new Error(`Creating tenant "${slug}" failed, and so did removing the new user ${userId} (${email}): ${cleanupError.message}`, { cause: insertError });
    }
    throw insertError;
  }
};
