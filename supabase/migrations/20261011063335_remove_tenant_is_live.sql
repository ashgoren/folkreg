-- Which payment keys apply depends on who is visiting, not on the tenant: the public always pays
-- with live keys, and a preview session creates test orders that use the test keys. Whether the
-- public sees the registration form is registration_config alone, so tenants.is_live has no job
-- left. Dropping the column also drops its column grant.
alter table tenants drop column is_live;

-- An order records its mode as is_test, so the default (false) is an ordinary order. Inverted on
-- rename so an existing live order stays live.
alter table orders rename column is_live to is_test;
update orders set is_test = not is_test;
alter table orders alter column is_test set default false;
