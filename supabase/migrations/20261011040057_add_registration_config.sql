-- When the registration form takes submissions (a manual switch, optional opening and closing
-- times, an optional people limit) and what a submission becomes (paid right away, a lottery
-- entry, or a waitlist place). Its own column, separate from admissions_config (pricing) and from
-- is_live (sandbox vs. live, which also picks the payment keys): registration can open and close
-- many times while a tenant stays live.
alter table tenants add column registration_config jsonb;

-- Existing rows get what defaultRegistrationConfig() gives a new tenant: open, paid right away, no
-- limits. showPreregistration starts from the show_preregistration column's value.
update tenants set registration_config = jsonb_build_object(
  'open', true,
  'opensAt', '',
  'closesAt', '',
  'closeAfter', jsonb_build_object('enabled', false, 'people', 100),
  'mode', 'pay',
  'waitlistAfter', jsonb_build_object('enabled', false, 'people', 100),
  'lotteryResultsDate', '',
  'showPreregistration', show_preregistration
);

-- Like every config column, always written in full by createTenant().
alter table tenants alter column registration_config set not null;

-- An organizer's session edits it from the admin (see tenant_column_grants).
grant update (registration_config) on tenants to authenticated;

-- payments_config gains paymentLinkDays (how long a payment link sent to an order stays valid),
-- at the default a new tenant gets.
update tenants set payments_config = payments_config || '{"paymentLinkDays": 7}'
where not payments_config ? 'paymentLinkDays';
