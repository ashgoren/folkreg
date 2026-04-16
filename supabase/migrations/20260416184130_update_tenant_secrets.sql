-- remove columns that are now platform-level env vars
-- google sheets service account, email smtp credentials moved to vercel env vars
alter table tenant_secrets
  drop column sheets_credentials,
  drop column email_user,
  drop column email_password;
