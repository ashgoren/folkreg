alter table tenant_secrets rename column stripe_secret_key to stripe_secret_key_live;
alter table tenant_secrets rename column stripe_webhook_secret to stripe_webhook_secret_live;
alter table tenant_secrets rename column paypal_secret to paypal_secret_live;
alter table tenant_secrets rename column paypal_webhook_id to paypal_webhook_id_live;

alter table tenant_secrets
  add column stripe_secret_key_test text,
  add column stripe_webhook_secret_test text,
  add column paypal_secret_test text,
  add column paypal_webhook_id_test text;
