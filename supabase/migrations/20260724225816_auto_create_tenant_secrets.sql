-- every tenant is expected to have exactly one tenant_secrets row
-- (getSecrets() throws if missing) -- enforce that automatically on insert
-- rather than relying on whatever creates the tenant to remember to do it
create or replace function create_tenant_secrets()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.tenant_secrets (tenant_id) values (new.id);
  return new;
end;
$$;

create trigger tenants_create_secrets
  after insert on tenants
  for each row execute function create_tenant_secrets();
