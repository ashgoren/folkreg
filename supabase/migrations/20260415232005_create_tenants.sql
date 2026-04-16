-- payment processor enum
create type payment_processor_type as enum ('stripe', 'paypal');

-- reusable trigger function for updated_at
create or replace function set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;

-- tenants
create table tenants (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  domain              text unique not null,  -- unique constraint creates implicit index for middleware lookups
  owner_id            uuid references auth.users,
  is_live             boolean not null default false,
  payment_processor   payment_processor_type,
  event_config        jsonb,
  registration_config jsonb,
  admissions_config   jsonb,
  payments_config     jsonb,
  theme_config        jsonb,
  spreadsheet_config  jsonb,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create trigger tenants_set_updated_at
  before update on tenants
  for each row execute function set_updated_at();

-- tenant_secrets
create table tenant_secrets (
  tenant_id             uuid primary key references tenants on delete cascade,
  stripe_secret_key     text,
  stripe_webhook_secret text,
  paypal_secret         text,
  paypal_webhook_id     text,
  docuseal_key          text,
  sheets_credentials    jsonb,
  email_user            text,
  email_password        text,
  email_from            text,
  email_reply_to        text
);

-- enable rls
-- (rls_auto_enable event trigger handles this on supabase cloud, but we add
-- explicit statements here for local docker environments where it doesn't exist)
alter table tenants enable row level security;
alter table tenant_secrets enable row level security;

-- rls policies for tenants
-- tenant owners can read their own tenant config
create policy "owners can read own tenant"
  on tenants for select
  using ((select auth.uid()) = owner_id);

-- tenant owners can update their own tenant config
create policy "owners can update own tenant"
  on tenants for update
  using ((select auth.uid()) = owner_id);

-- no insert or delete policies -- service role only
-- no policies on tenant_secrets -- service role only
