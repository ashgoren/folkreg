-- A tenant's slug is its registration site's hostname, {slug}.folkreg.org: a valid DNS label
-- (lowercase letters, digits, and hyphens, 1-63 long, not starting or ending with a hyphen), and not
-- a name the platform uses itself. The same rules are slugSchema in packages/tenant-config
-- (src/slug.ts), which the admin uses to show them inline; a @repo/db test checks the reserved
-- lists match.
alter table tenants add constraint tenants_slug_valid check (
  slug ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
  and slug not in (
    'www', 'admin', 'api', 'app', 'mail', 'smtp', 'status', 'docs', 'help', 'support', 'blog',
    'staging', 'preview', 'assets', 'static', 'cdn'
  )
);
