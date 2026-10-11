-- When registration opens is one choice, `opening`, instead of an `open` switch narrowed by an
-- optional opensAt; the closing time is a condition switched on or off like closeAfter:
--   open false              -> opening "closed"
--   open true, opensAt ""   -> opening "now"
--   open true, opensAt set  -> opening "scheduled"
--   closesAt                -> closeAt { enabled: closesAt is set, at: closesAt }
-- opensAt stays as it is, kept even when it no longer applies.
update tenants set registration_config = (registration_config - 'open' - 'closesAt') || jsonb_build_object(
  'opening', case
    when not (registration_config->>'open')::boolean then 'closed'
    when registration_config->>'opensAt' = '' then 'now'
    else 'scheduled'
  end,
  'closeAt', jsonb_build_object(
    'enabled', registration_config->>'closesAt' <> '',
    'at', registration_config->>'closesAt'
  )
)
where registration_config ? 'open';
