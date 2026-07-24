-- show_preregistration: promoted from registration_config to a plain scalar,
-- since it was the only field left with no clear jsonb column of its own
alter table tenants add column show_preregistration boolean not null default false;

-- registration_config narrows to hold only FieldsConfig directly (no wrapper);
-- waitlistCutoff/showPreregistration/showWaiver/docusealTemplateId/admissionQuantityMax
-- move to their proper owning columns below
alter table tenants rename column registration_config to fields_config;

-- waiver_config: split out of registration_config (show, docusealTemplateId)
alter table tenants add column waiver_config jsonb;

-- payment_processor moves into payments_config jsonb (as `processor`) --
-- the only writer is the admin app's typed/validated action, so the DB-level
-- enum constraint wasn't adding real protection
alter table tenants drop column payment_processor;
drop type payment_processor_type;
