-- Whether registrants see the preregistration page is registration_config.showPreregistration,
-- edited on the Registration page. Copied over once more first, so a change made on the General
-- page since add_registration_config isn't lost. Dropping the column also drops its column grant.
update tenants set registration_config = registration_config || jsonb_build_object('showPreregistration', show_preregistration);

alter table tenants drop column show_preregistration;
