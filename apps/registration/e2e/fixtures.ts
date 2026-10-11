import { test as base, expect } from "@playwright/test";
import { REGISTRATION_TENANT_SLUG, createServiceClient, getTenantIdBySlug, resetTenant } from "../test/supabase";

export const service = createServiceClient();

type Fixtures = {
  tenantId: string;
};

export const test = base.extend<Fixtures>({
  // `auto` so the reset runs before every test, including ones that never ask for tenantId --
  // each test starts from the freshly-seeded tenant regardless of what ran before it.
  tenantId: [
    // Playwright reads a fixture's dependencies from its first parameter's destructuring pattern,
    // so a fixture with none still needs the empty `{}`. The callback is named `provide` rather
    // than Playwright's conventional `use`, which the react-hooks lint rule mistakes for React's
    // use() hook.
    // eslint-disable-next-line no-empty-pattern
    async ({}, provide) => {
      const tenantId = await getTenantIdBySlug(service, REGISTRATION_TENANT_SLUG);
      await resetTenant(service, tenantId);
      await provide(tenantId);
    },
    { auto: true },
  ],
});

export { expect };
