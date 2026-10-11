-- Adds "folkreg" to the reserved slugs: folkreg.org itself is a two-label host, which the
-- registration app can't tell apart from a tenant subdomain like dev.localhost, so its first label
-- must never be a tenant's slug. Same list as RESERVED_SLUGS in packages/tenant-config
-- (src/slug.ts); a @repo/db test checks they match.
alter table tenants drop constraint tenants_slug_valid;
alter table tenants add constraint tenants_slug_valid check (
  slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
  and slug not in (
    'www', 'admin', 'api', 'app', 'mail', 'smtp', 'status', 'docs', 'help', 'support', 'blog',
    'staging', 'preview', 'assets', 'static', 'cdn', 'folkreg'
  )
);
