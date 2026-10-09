-- updated_at always gets a value from its own default() or the orders_set_updated_at trigger --
-- nothing should ever explicitly null it out, and code relies on it always being present (e.g.
-- the optimistic-concurrency check in updateOrderPeople).
alter table orders alter column updated_at set not null;
