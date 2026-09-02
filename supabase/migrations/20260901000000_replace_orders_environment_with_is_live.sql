alter table orders add column is_live boolean not null default true;
alter table orders drop column environment;
drop type environment_type;
