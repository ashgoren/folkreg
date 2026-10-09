import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import { defaultEventConfig, defaultPaymentsConfig, defaultReceiptsConfig, defaultTenantConfig, defaultThemeConfig, type PaymentsConfig } from "@repo/tenant-config";
import type { TenantSecrets } from "@repo/types";
import { createTestClient, getTestTenantId } from "./test-helpers";
import { createTenantDb, getTenantBySlug } from "./queries";
import { TenantNotFoundError } from "./errors";

const supabase = createTestClient();
let tenantId: string;
let db: ReturnType<typeof createTenantDb>;

const emptySecrets: Omit<TenantSecrets, "tenant_id"> = {
  stripe_secret_key_live: null,
  stripe_webhook_secret_live: null,
  stripe_secret_key_test: null,
  stripe_webhook_secret_test: null,
  paypal_secret_live: null,
  paypal_webhook_id_live: null,
  paypal_secret_test: null,
  paypal_webhook_id_test: null,
  docuseal_key: null,
};

// Returns test-tenant to its seeded state, for the columns this suite writes. The orders suite
// shares this tenant but only touches the orders table, so resetting config here can't disturb it.
const resetTenant = async () => {
  await db.updateTenant({
    is_live: false,
    event_config: defaultEventConfig(),
    payments_config: defaultPaymentsConfig(),
    theme_config: defaultThemeConfig(),
    receipts_config: defaultReceiptsConfig(),
  });
  await db.updateTenantSecrets(emptySecrets);
};

beforeAll(async () => {
  tenantId = await getTestTenantId(supabase);
  db = createTenantDb(supabase, tenantId);
});
beforeEach(resetTenant);
afterAll(resetTenant);

describe("getTenantBySlug", () => {
  it("returns the id for a known slug", async () => {
    expect(await getTenantBySlug(supabase, "test-tenant")).toEqual({ id: tenantId });
  });

  it("returns null for an unknown slug", async () => {
    expect(await getTenantBySlug(supabase, "no-such-tenant")).toBeNull();
  });
});

describe("getTenant / getSecrets", () => {
  it("returns the tenant row", async () => {
    expect((await db.getTenant())?.slug).toBe("test-tenant");
  });

  // A row whose jsonb doesn't match its schema (written by an older shape of the code, or edited
  // by hand) fails at the read with every invalid field named, rather than surfacing later as a
  // missing value. Written straight through the client to get past updateTenant's typing.
  it("rejects a config column that doesn't match its schema, naming the field", async () => {
    await supabase.from("tenants").update({ event_config: { ...defaultEventConfig(), calendar: "not an object" } }).eq("id", tenantId);
    await expect(db.getTenant()).rejects.toThrow(/Tenant .* has invalid config:[\s\S]*event_config\.calendar/);
  });

  it("returns null for a tenant that doesn't exist", async () => {
    expect(await createTenantDb(supabase, "00000000-0000-0000-0000-000000000000").getTenant()).toBeNull();
  });

  // The tenants_create_secrets trigger guarantees a paired row for every tenant.
  it("returns the tenant's paired secrets row", async () => {
    expect(await db.getSecrets()).toEqual({ tenant_id: tenantId, ...emptySecrets });
  });

  // 1:1 with tenants, so a missing secrets row is a data integrity error, not "not found".
  it("throws rather than returning null when the secrets row is missing", async () => {
    await expect(createTenantDb(supabase, "00000000-0000-0000-0000-000000000000").getSecrets()).rejects.toMatchObject({ code: "PGRST116" });
  });
});

describe("updateTenant", () => {
  const event = { ...defaultEventConfig(), title: "Dance", year: 2026 };

  it("writes only the columns passed, leaving the rest untouched", async () => {
    await db.updateTenant({ event_config: event });
    await db.updateTenant({ is_live: true });

    const tenant = await db.getTenant();
    expect(tenant?.event_config).toEqual(event);
    expect(tenant?.is_live).toBe(true);
    expect(tenant?.payments_config).toEqual(defaultPaymentsConfig());
  });

  it("round-trips jsonb columns as their typed shape", async () => {
    const theme = { backgroundLight: "#ffffff", backgroundDark: "#000000", foregroundLight: "#111111", foregroundDark: "#eeeeee", accentLight: "#d97706", accentDark: "#f59e0b" };
    await db.updateTenant({ theme_config: theme, receipts_config: { emailFrom: "a@example.org", emailReplyTo: "" } });

    const tenant = await db.getTenant();
    expect(tenant?.theme_config).toEqual(theme);
    expect(tenant?.receipts_config).toEqual({ emailFrom: "a@example.org", emailReplyTo: "" });
  });

  // A key present but set to undefined (e.g. from spreading a partial object) is left out of the
  // request body when supabase-js serializes it to JSON, so the column keeps its value rather
  // than being nulled.
  it("leaves a column untouched when its key is passed as undefined", async () => {
    await db.updateTenant({ event_config: event });
    await db.updateTenant({ event_config: undefined, is_live: true });

    const tenant = await db.getTenant();
    expect(tenant?.event_config).toEqual(event);
    expect(tenant?.is_live).toBe(true);
  });

  // Checked against other-tenant specifically: the admin app's suites legitimately flip
  // is_live on their own tenants while this suite runs in parallel, but nothing ever sets
  // other-tenant live, so a change there can only come from a mis-scoped update here.
  it("is scoped to its own tenant", async () => {
    const otherTenant = await getTenantBySlug(supabase, "other-tenant");
    await db.updateTenant({ is_live: true });
    const { data } = await supabase.from("tenants").select("is_live").eq("id", otherTenant!.id).single();
    expect(data?.is_live).toBe(false);
  });

  // A zero-row UPDATE is a success to Postgres; the method turns it into an error so a write
  // that didn't happen can't pass for one that did. Under RLS, the same path covers a tenant
  // the user doesn't own.
  it("throws TenantNotFoundError when no tenant matches", async () => {
    await expect(createTenantDb(supabase, "00000000-0000-0000-0000-000000000000").updateTenant({ is_live: true }))
      .rejects.toBeInstanceOf(TenantNotFoundError);
  });

  it("surfaces a database error, e.g. a duplicate slug", async () => {
    await expect(db.updateTenant({ slug: "admin-test-tenant" })).rejects.toMatchObject({ code: "23505" });
  });

  it("advances updated_at on every write", async () => {
    const before = (await db.getTenant())!.updated_at;
    await db.updateTenant({ is_live: true });
    const after = (await db.getTenant())!.updated_at;
    expect(new Date(after).getTime()).toBeGreaterThan(new Date(before).getTime());
  });
});

describe("tenants timestamps", () => {
  // Tried on insert: on update, the set_updated_at trigger would replace a null updated_at with
  // now() before the constraint is checked. The cast gets past the generated types, which don't
  // allow null here, so this checks the database constraint itself.
  it.each(["created_at", "updated_at"])("rejects a null %s", async (column) => {
    const { data, error } = await supabase
      .from("tenants")
      .insert({ slug: `null-${column.replace("_", "-")}`, ...defaultTenantConfig(), [column]: null } as never)
      .select("id");
    // Only reached if the constraint is missing: removes the row so the failure doesn't linger.
    if (data?.[0]) await supabase.from("tenants").delete().eq("id", data[0].id);
    expect(error).toMatchObject({ code: "23502" }); // not_null_violation
  });
});

describe("updateTenantSecrets", () => {
  it("writes only the credential columns passed", async () => {
    await db.updateTenantSecrets({ docuseal_key: "dk_1" });
    await db.updateTenantSecrets({ stripe_secret_key_test: "sk_test_1" });
    expect(await db.getSecrets()).toMatchObject({ docuseal_key: "dk_1", stripe_secret_key_test: "sk_test_1", stripe_secret_key_live: null });
  });

  it("throws TenantNotFoundError when no secrets row matches", async () => {
    await expect(createTenantDb(supabase, "00000000-0000-0000-0000-000000000000").updateTenantSecrets({ docuseal_key: "dk_1" }))
      .rejects.toBeInstanceOf(TenantNotFoundError);
  });
});

describe("getPaymentProcessorCredentials", () => {
  const paymentsConfig = (overrides: Partial<PaymentsConfig> = {}): PaymentsConfig => ({
    ...defaultPaymentsConfig(),
    stripePublishableKeyLive: "pk_live",
    stripePublishableKeyTest: "pk_test",
    paypalClientIdLive: "client_live",
    paypalClientIdTest: "client_test",
    ...overrides,
  });

  const allSecrets = {
    stripe_secret_key_live: "sk_live",
    stripe_webhook_secret_live: "whsec_live",
    stripe_secret_key_test: "sk_test",
    stripe_webhook_secret_test: "whsec_test",
    paypal_secret_live: "pp_secret_live",
    paypal_webhook_id_live: "pp_wh_live",
    paypal_secret_test: "pp_secret_test",
    paypal_webhook_id_test: "pp_wh_test",
  };

  // is_live picks which credential set is active: the same tenant row resolves to its test
  // credentials in sandbox mode and its live ones once it goes live.
  it.each([
    ["stripe", false, { processor: "stripe", secretKey: "sk_test", webhookSecret: "whsec_test", publishableKey: "pk_test" }],
    ["stripe", true, { processor: "stripe", secretKey: "sk_live", webhookSecret: "whsec_live", publishableKey: "pk_live" }],
    ["paypal", false, { processor: "paypal", clientId: "client_test", secret: "pp_secret_test", webhookId: "pp_wh_test" }],
    ["paypal", true, { processor: "paypal", clientId: "client_live", secret: "pp_secret_live", webhookId: "pp_wh_live" }],
  ] as const)("resolves %s credentials with is_live=%s", async (processor, isLive, expected) => {
    await db.updateTenant({ is_live: isLive, payments_config: paymentsConfig({ processor }) });
    await db.updateTenantSecrets(allSecrets);
    expect(await db.getPaymentProcessorCredentials()).toEqual(expected);
  });

  it("throws when the tenant doesn't exist", async () => {
    const missing = "00000000-0000-0000-0000-000000000000";
    // getSecrets() rejects first for a missing tenant (no secrets row either), so this asserts
    // only that it rejects, not on which of the two parallel fetches' errors wins.
    await expect(createTenantDb(supabase, missing).getPaymentProcessorCredentials()).rejects.toBeDefined();
  });

  // Each mode is checked on its own: a fully-configured test set doesn't help a live tenant
  // whose live set is incomplete, and the error names which mode is missing.
  it.each([
    ["stripe", true, { stripe_secret_key_live: null }, "Stripe live"],
    ["stripe", false, { stripe_webhook_secret_test: null }, "Stripe test"],
    ["paypal", true, { paypal_webhook_id_live: null }, "PayPal live"],
    ["paypal", false, { paypal_secret_test: null }, "PayPal test"],
  ] as const)("throws when a %s secret is missing (is_live=%s)", async (processor, isLive, missing, label) => {
    await db.updateTenant({ is_live: isLive, payments_config: paymentsConfig({ processor }) });
    await db.updateTenantSecrets({ ...allSecrets, ...missing });
    await expect(db.getPaymentProcessorCredentials()).rejects.toThrow(`Tenant ${tenantId} is missing ${label} credentials`);
  });

  it.each([
    ["stripe", true, { stripePublishableKeyLive: "" }, "Stripe live"],
    ["paypal", false, { paypalClientIdTest: "" }, "PayPal test"],
  ] as const)("throws when the %s public key is missing (is_live=%s)", async (processor, isLive, missing, label) => {
    await db.updateTenant({ is_live: isLive, payments_config: paymentsConfig({ processor, ...missing }) });
    await db.updateTenantSecrets(allSecrets);
    await expect(db.getPaymentProcessorCredentials()).rejects.toThrow(`missing ${label} credentials`);
  });

  // An empty string is as unusable as null for an API key, and the resolver's truthiness
  // check treats it that way.
  it("treats an empty-string secret as missing", async () => {
    await db.updateTenant({ is_live: false, payments_config: paymentsConfig() });
    await db.updateTenantSecrets({ ...allSecrets, stripe_secret_key_test: "" });
    await expect(db.getPaymentProcessorCredentials()).rejects.toThrow("missing Stripe test credentials");
  });

  // getTenant() parses payments_config, so an unknown processor is rejected at the read, before
  // the resolver ever sees it.
  it("throws for an unknown processor", async () => {
    await db.updateTenant({ payments_config: paymentsConfig({ processor: "square" as never }) });
    await expect(db.getPaymentProcessorCredentials()).rejects.toThrow(`Tenant ${tenantId} has invalid config`);
  });
});
