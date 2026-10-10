-- Which columns a signed-in user's session may write, on top of RLS (which decides which rows).
-- Supabase grants every table privilege to `anon` and `authenticated` by default, so without this
-- an owner bypassing the admin UI could write any column of their own row -- e.g. `id` or
-- `created_at`. (`owner_id` is also kept safe by the update policy, which applies its `using`
-- condition to the updated row as well; this doesn't depend on that.)
--
-- An owner's session writes exactly what the admin edits. Anything else (creating tenants,
-- reassigning an owner) goes through the service role, which these grants don't affect. A new
-- column the admin edits needs adding here, or saving it fails with "permission denied".

revoke insert, update, delete on tenants from anon, authenticated;
grant update (
  slug, is_live, show_preregistration,
  event_config, fields_config, admissions_config, payments_config, theme_config, waiver_config,
  receipts_config, spreadsheet_config
) on tenants to authenticated;

revoke insert, update, delete on tenant_secrets from anon, authenticated;
grant update (
  stripe_secret_key_live, stripe_webhook_secret_live, stripe_secret_key_test, stripe_webhook_secret_test,
  paypal_secret_live, paypal_webhook_id_live, paypal_secret_test, paypal_webhook_id_test,
  docuseal_key
) on tenant_secrets to authenticated;
