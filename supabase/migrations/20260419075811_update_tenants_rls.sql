-- platform admin policies for tenants
create policy "platform admin can read all tenants"
  on tenants for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'platform_admin');

create policy "platform admin can update all tenants"
  on tenants for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'platform_admin');

-- rls policies for tenant_secrets (previously service role only)
create policy "owners can read own tenant secrets"
  on tenant_secrets for select
  using ((select auth.uid()) = (select owner_id from tenants where id = tenant_id));

create policy "owners can update own tenant secrets"
  on tenant_secrets for update
  using ((select auth.uid()) = (select owner_id from tenants where id = tenant_id));

create policy "platform admin can read all tenant secrets"
  on tenant_secrets for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'platform_admin');

create policy "platform admin can update all tenant secrets"
  on tenant_secrets for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'platform_admin');
