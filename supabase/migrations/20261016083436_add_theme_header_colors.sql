-- Optional header colors for the registration site, one per mode. "" (unset) means the header is
-- the page background tinted with the accent. Existing rows get the keys so they still parse
-- (getTenant() validates theme_config against its schema on every read). In jsonb's ||, the right
-- side's keys win, so the defaults go on the left and any value already stored is kept.
update tenants
set theme_config = '{"headerLight": "", "headerDark": ""}'::jsonb || theme_config;
