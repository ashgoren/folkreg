-- Every tenant is created with its full default config (defaultTenantConfig() in
-- packages/tenant-config, written by createTenant() in packages/db), so these columns always
-- hold a value. Enforcing it here makes that a guarantee of the schema rather than a convention
-- every insert has to remember, and lets the generated types drop `| null` for them. A tenant with
-- no sheet set up yet has a blank spreadsheet_config.sheetId, not a null column.
alter table tenants
  alter column event_config set not null,
  alter column fields_config set not null,
  alter column admissions_config set not null,
  alter column payments_config set not null,
  alter column theme_config set not null,
  alter column waiver_config set not null,
  alter column receipts_config set not null,
  alter column spreadsheet_config set not null;
