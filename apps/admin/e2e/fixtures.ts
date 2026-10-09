import { test as base, expect, type Page } from "@playwright/test";
import type { Tenant } from "@repo/types";
import { E2E_OWNER_EMAIL, E2E_TENANT_SLUG, createServiceClient, readTenant, resetTenant } from "../test/supabase";

export const service = createServiceClient();

// readTenant returns the raw row, whose jsonb columns are typed as generic Json. Specs assert on
// specific config fields, so this narrows the row to Tenant -- the same cast createTenantDb's
// getTenant() applies in app code.
export const readTenantConfig = async (tenantId: string) => (await readTenant(service, tenantId)) as Tenant;

// Looked up by owner rather than slug: general.spec.ts renames the slug, and a run that dies
// mid-test would otherwise leave every later lookup-by-slug unable to find the tenant to reset.
const getE2eTenantId = async () => {
  const { data: users, error: usersError } = await service.auth.admin.listUsers();
  if (usersError) throw usersError;
  const owner = users.users.find((user) => user.email === E2E_OWNER_EMAIL);
  if (!owner) throw new Error(`Seed user ${E2E_OWNER_EMAIL} not found -- run \`supabase db reset\``);

  const { data, error } = await service.from("tenants").select("id").eq("owner_id", owner.id).single();
  if (error) throw new Error(`No tenant owned by ${E2E_OWNER_EMAIL} -- run \`supabase db reset\`: ${error.message}`);
  return data.id;
};

export type Section =
  | "general" | "event" | "fields" | "admissions" | "payments"
  | "waivers" | "receipts" | "spreadsheet" | "appearance";

type Fixtures = {
  tenantId: string;
  dashboardUrl: (section: Section) => string;
};

export const test = base.extend<Fixtures>({
  // `auto` so the reset runs before every test, including ones that never ask for tenantId --
  // each test starts from the freshly-seeded tenant regardless of what ran before it.
  tenantId: [
    // Playwright reads a fixture's dependencies from its first parameter's destructuring pattern,
    // so a fixture with none still needs the empty `{}`.
    // eslint-disable-next-line no-empty-pattern
    async ({}, provide) => {
      const tenantId = await getE2eTenantId();
      await resetTenant(service, tenantId, E2E_TENANT_SLUG);
      await provide(tenantId);
    },
    { auto: true },
  ],
  // The callback is named `provide` rather than Playwright's conventional `use`, which the
  // react-hooks lint rule mistakes for React's use() hook.
  dashboardUrl: async ({ tenantId }, provide) => provide((section) => `/dashboard/${tenantId}/${section}`),
});

export { expect };

// Waits for the AutosaveStatus label. "Saved ✓" stays up for ~2s after any save, so on its own
// it can't tell one save from the next -- specs pair it with an expect.poll on the DB row for
// the exact values they expect, and only reload once that poll passes.
export const waitForSaved = (page: Page) => expect(page.getByText("Saved ✓")).toBeVisible();

// Drags a dnd-kit sortable row by its grip handle onto the vertical position of another row.
// dnd-kit's pointer sensor only starts a drag after the pointer moves a few pixels with the
// button held, and resolves the drop target from pointermove events along the way -- a single
// jump (or Playwright's dragTo, which fires HTML5 drag events dnd-kit doesn't listen to) never
// registers as a sort, so the pointer is walked there in small steps.
export const dragRowOnto = async (page: Page, handle: ReturnType<Page["locator"]>, target: ReturnType<Page["locator"]>) => {
  const from = await handle.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("Drag source or target is not visible");

  const startX = from.x + from.width / 2;
  const startY = from.y + from.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + 10, { steps: 5 });
  await page.mouse.move(startX, to.y + to.height / 2, { steps: 20 });
  await page.mouse.up();
};
