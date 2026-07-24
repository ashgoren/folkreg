-- email_from/email_reply_to aren't actually secrets (no more sensitive than the
-- contact emails already sitting in tenants.event_config) -- they only lived in
-- tenant_secrets historically, next to email_user/email_password before those
-- became platform-level env vars. Move them into their own jsonb column,
-- matching the one-concern-per-column pattern (theme_config, waiver_config, etc.)
alter table tenants add column receipts_config jsonb;

alter table tenant_secrets
  drop column email_from,
  drop column email_reply_to;
