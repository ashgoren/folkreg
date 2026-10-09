alter table orders
  drop column status,
  drop column payment_method,
  drop column payment_id,
  drop column payment_email,
  drop column charged,
  drop column deposit,
  drop column total,
  drop column fees,
  drop column completed_at;

drop type order_status_type;
drop type payment_method_type;

alter table orders add column registered_at timestamptz;
alter table orders add column payments jsonb not null default '[]'::jsonb;
alter table orders add column lottery jsonb;

alter table orders add column updated_at timestamptz default now();
create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();
