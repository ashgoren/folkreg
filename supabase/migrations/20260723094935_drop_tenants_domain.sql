-- custom-domain support and Vercel for Platforms have been dropped;
-- every tenant is served at {slug}.folkreg.org
alter table tenants drop column domain;
