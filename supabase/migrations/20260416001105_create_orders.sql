-- enums
create type order_status_type as enum ('pending', 'final');
create type payment_method_type as enum ('stripe', 'paypal', 'check');
create type environment_type as enum ('dev', 'stg', 'prd');

-- orders
create table orders (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid references tenants on delete restrict,
  people         jsonb,
  donation       numeric,
  deposit        numeric,
  total          numeric,
  fees           numeric,
  charged        numeric,
  payment_method payment_method_type,
  payment_id     text,
  payment_email  text,
  status         order_status_type,
  is_waitlist    boolean not null default false,
  environment    environment_type,
  created_at     timestamptz default now(),
  completed_at   timestamptz
);

-- enable rls (no policies -- service role only)
alter table orders enable row level security;
