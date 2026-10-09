-- Minimal tenant fixture for packages/db integration tests and (later) Playwright e2e tests.
-- Looked up by slug rather than a hardcoded id, so tests and this file can't drift apart.
insert into tenants (slug) values ('test-tenant');
