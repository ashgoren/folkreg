-- remove unused tenants slug column
alter table tenants
  drop column slug;
