-- The waitlist setting moves from admissions_config.waitlist to registration_config, where it's
-- part of what a submission becomes:
--   "now"       -> mode "waitlist"
--   "when-full" -> waitlistAfter on, at the stored capacity
--   "never"     -> nothing to change
-- The capacity is kept as waitlistAfter's number either way, so it's there if the limit is turned
-- on later.
update tenants set registration_config = registration_config || jsonb_build_object(
  'mode', case when admissions_config->'waitlist'->>'when' = 'now' then 'waitlist' else registration_config->>'mode' end,
  'waitlistAfter', jsonb_build_object(
    'enabled', admissions_config->'waitlist'->>'when' = 'when-full',
    'people', admissions_config->'waitlist'->'capacity'
  )
)
where admissions_config ? 'waitlist';

update tenants set admissions_config = admissions_config - 'waitlist';
