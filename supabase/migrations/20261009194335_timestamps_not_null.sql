-- Every row gets these from their now() defaults (and updated_at from the set_updated_at
-- triggers), so they're always present in practice. Enforcing it here makes that a guarantee of
-- the schema rather than a convention, and lets the generated types drop `| null`.
-- orders.updated_at is already not null (20261008230000).
alter table tenants
  alter column created_at set not null,
  alter column updated_at set not null;

alter table orders
  alter column created_at set not null;
