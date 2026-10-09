-- Test fixtures for local Supabase, applied automatically on `supabase db reset`.
--
-- Each test suite gets its own tenant, because turbo runs every package's `test` task in
-- parallel and the suites mutate tenant config -- sharing one tenant would make them race:
--   test-tenant        packages/db integration tests (service role, so no owner)
--   admin-test-tenant  apps/admin server action tests (owned by admin-owner@test.local)
--   e2e-tenant         apps/admin Playwright tests (owned by e2e-owner@test.local)
--   other-tenant       a tenant owned by someone else, for cross-tenant RLS checks
-- Owners are distinct users since getTenantByOwner (apps/admin/lib/tenant.ts) assumes one
-- tenant per owner. Tests look tenants up by slug or owner rather than hardcoding tenant ids.
--
-- Every test user's password is 'test-password'.

-- GoTrue (Supabase Auth) needs both an auth.users row with a bcrypt hash and a matching
-- auth.identities row for email/password sign-in to work. The *_token/email_change columns
-- must be '' rather than NULL -- GoTrue scans them into non-nullable Go strings, so a NULL
-- there makes sign-in fail with an opaque 500.
create function pg_temp.create_test_user(user_id uuid, user_email text) returns void
language sql as $$
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated', user_email,
    extensions.crypt('test-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), user_id, user_id::text, 'email',
    jsonb_build_object('sub', user_id::text, 'email', user_email, 'email_verified', true),
    now(), now(), now()
  );
$$;

select pg_temp.create_test_user('00000000-0000-0000-0000-00000000a001', 'admin-owner@test.local');
select pg_temp.create_test_user('00000000-0000-0000-0000-00000000a002', 'e2e-owner@test.local');
select pg_temp.create_test_user('00000000-0000-0000-0000-00000000a003', 'other-owner@test.local');

insert into tenants (slug, owner_id) values
  ('test-tenant', null),
  ('admin-test-tenant', '00000000-0000-0000-0000-00000000a001'),
  ('e2e-tenant', '00000000-0000-0000-0000-00000000a002'),
  ('other-tenant', '00000000-0000-0000-0000-00000000a003');
