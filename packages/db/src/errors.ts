// The shape of an error from supabase-js (PostgrestError). For a constraint violation, the
// constraint's name appears in `message` (e.g. 'duplicate key value violates unique constraint
// "tenants_slug_key"'); `details` is often null, since PostgREST omits it for roles that
// shouldn't see the conflicting row's values.
export function isPostgresError(error: unknown): error is { code: string; message: string; details: string | null } {
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

// Thrown by createTenantDb's update methods when the UPDATE matched no row: the tenant doesn't
// exist, or RLS hides it from the current user. Postgres treats an UPDATE that touches zero rows
// as a success, so without this check a write the user isn't allowed to make would look
// identical to one that went through.
export class TenantNotFoundError extends Error {
  constructor(tenantId: string) {
    super(`Tenant ${tenantId} not found or not accessible`);
    this.name = 'TenantNotFoundError';
  }
}
