alter table tenants add column slug text unique not null default '';
alter table tenants alter column slug drop default;
alter table tenants alter column domain drop not null;
