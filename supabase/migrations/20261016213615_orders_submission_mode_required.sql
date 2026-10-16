-- Orders are written only when a registration is submitted, and submitRegistration decides the mode
-- before creating the order, so every order has a mode from the start. A pay-mode order is pending
-- (registered_at null) until its first payment; lottery and waitlist entries are registered at
-- creation.
delete from orders where submission_mode is null;
alter table orders alter column submission_mode set not null;
alter table orders add constraint orders_submission_mode_valid
  check (submission_mode in ('pay', 'waitlist', 'lottery'));
