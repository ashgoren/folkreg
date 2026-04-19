-- replace separate owner/admin policies with merged single policies per operation
-- (multiple permissive policies have a per-role performance cost)

drop policy "owners can read own tenant" on tenants;
drop policy "owners can update own tenant" on tenants;
drop policy "platform admin can read all tenants" on tenants;
drop policy "platform admin can update all tenants" on tenants;

create policy "can read tenant"
  on tenants for select
  using (
    (select auth.uid()) = owner_id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'platform_admin'
  );

create policy "can update tenant"
  on tenants for update
  using (
    (select auth.uid()) = owner_id
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'platform_admin'
  );

create policy "can read tenant secrets"
  on tenant_secrets for select
  using (
    (select auth.uid()) = (select owner_id from tenants where id = tenant_id)
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'platform_admin'
  );

create policy "can update tenant secrets"
  on tenant_secrets for update
  using (
    (select auth.uid()) = (select owner_id from tenants where id = tenant_id)
    or (select auth.jwt() -> 'app_metadata' ->> 'role') = 'platform_admin'
  );
