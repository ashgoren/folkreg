import { describe, it, expect, vi } from "vitest";
import { defaultPaymentsConfig } from "@repo/tenant-config";
import { readSecrets, readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updatePayments, updatePaymentSecrets } from "./actions";
import type { PaymentSecretsValues } from "./schema";
import type { PaymentsConfig } from "@repo/tenant-config";

// payments_config (including the publishable keys and client IDs, which are public) and the
// credential secrets in tenant_secrets each have their own action, which writes only its own table.

// payments_config with both processors' public credentials filled in, Stripe active.
const values = (overrides: Partial<PaymentsConfig> = {}): PaymentsConfig => ({
  ...defaultPaymentsConfig(),
  stripePublishableKeyLive: "pk_live_1",
  stripePublishableKeyTest: "pk_test_1",
  statementDescriptorSuffix: "DANCE",
  paypalClientIdLive: "client_live_1",
  paypalClientIdTest: "client_test_1",
  ...overrides,
});

// Both processors' secrets filled in.
const secrets = (overrides: Partial<PaymentSecretsValues> = {}): PaymentSecretsValues => ({
  stripe_secret_key_live: "sk_live_1",
  stripe_webhook_secret_live: "whsec_live_1",
  stripe_secret_key_test: "sk_test_1",
  stripe_webhook_secret_test: "whsec_test_1",
  paypal_secret_live: "pp_secret_live_1",
  paypal_webhook_id_live: "wh_live_1",
  paypal_secret_test: "pp_secret_test_1",
  paypal_webhook_id_test: "wh_test_1",
  ...overrides,
});

describe("updatePayments", () => {
  const harness = useActionHarness(createClient);
  const savedConfig = async () => (await readTenant(harness.service, harness.tenantId)).payments_config;
  const savedSecrets = async () => readSecrets(harness.service, harness.tenantId);

  it("saves payments_config, including the public keys, leaving the secrets alone", async () => {
    await harness.service.from("tenant_secrets").update({ stripe_secret_key_live: "sk_keep" }).eq("tenant_id", harness.tenantId);
    expect(await updatePayments(harness.tenantId, values())).toBeNull();

    expect(await savedConfig()).toMatchObject({
      processor: "stripe",
      stripePublishableKeyLive: "pk_live_1",
      stripePublishableKeyTest: "pk_test_1",
      statementDescriptorSuffix: "DANCE",
      paypalClientIdLive: "client_live_1",
      paypalClientIdTest: "client_test_1",
    });
    expect((await savedSecrets()).stripe_secret_key_live).toBe("sk_keep");
  });

  // The config schema keeps only its own keys, so a secret sent along with the config never
  // reaches the readable column.
  it("never stores a secret sent with the config", async () => {
    await updatePayments(harness.tenantId, { ...values(), ...secrets() } as never);
    const config = JSON.stringify(await savedConfig());
    for (const secret of Object.values(secrets())) expect(config).not.toContain(secret);
  });

  // Switching processors only changes which set is active, so an accidental click on the other
  // processor can't cost an organizer the credentials they entered.
  it("keeps the other processor's public credentials when switching processors", async () => {
    await updatePayments(harness.tenantId, values());
    await updatePayments(harness.tenantId, values({ processor: "paypal" }));
    expect(await savedConfig()).toMatchObject({ processor: "paypal", stripePublishableKeyLive: "pk_live_1", statementDescriptorSuffix: "DANCE" });
  });

  describe("shared settings", () => {
    it("rejects a cleared (NaN) deposit amount without saving", async () => {
      expect(await updatePayments(harness.tenantId, values({ deposit: { enabled: true, amount: NaN } }))).toBe("Invalid data");
      // Still the tenant's default deposit settings.
      expect(await savedConfig()).toMatchObject({ deposit: defaultPaymentsConfig().deposit });
    });

    it("saves deposit, donation, fee, summary, and direct-payment settings", async () => {
      await updatePayments(harness.tenantId, values({
        paymentDueDate: "2027-05-01",
        directPaymentUrl: "https://example.org/pay",
        coverFees: { enabled: true, percent: 2.9, fixed: 0.3 },
        showPaymentSummary: false,
        deposit: { enabled: true, amount: 50 },
        donation: { enabled: true, max: 200 },
      }));
      expect(await savedConfig()).toMatchObject({
        paymentDueDate: "2027-05-01",
        directPaymentUrl: "https://example.org/pay",
        coverFees: { enabled: true, percent: 2.9, fixed: 0.3 },
        showPaymentSummary: false,
        deposit: { enabled: true, amount: 50 },
        donation: { enabled: true, max: 200 },
      });
    });

    // checks.address is stored exactly as entered (multi-line string, not split into lines);
    // parsing into display lines is the registration app's job.
    it("saves check settings with the address as entered", async () => {
      const address = "Folk Society\n123 Main St\nSpringfield, OR 97477";
      await updatePayments(harness.tenantId, values({ checks: { allowed: true, sendTo: "address", payee: "Folk Society", address } }));
      expect(await savedConfig()).toMatchObject({ checks: { allowed: true, sendTo: "address", payee: "Folk Society", address } });
    });

    it("stores blank text settings as \"\"", async () => {
      await updatePayments(harness.tenantId, values());
      expect(await savedConfig()).toMatchObject({ paymentDueDate: "", directPaymentUrl: "", checks: { payee: "", address: "" } });
    });
  });

  itGuardsTheAction({
    harness, createClient, run: updatePayments,
    validValues: () => values(),
    invalidValues: () => values({ deposit: { enabled: true, amount: -10 } }),
  });
});

describe("updatePaymentSecrets", () => {
  const harness = useActionHarness(createClient);
  const savedSecrets = async () => readSecrets(harness.service, harness.tenantId);

  it("saves both processors' secrets, leaving payments_config alone", async () => {
    const before = (await readTenant(harness.service, harness.tenantId)).payments_config;
    expect(await updatePaymentSecrets(harness.tenantId, secrets())).toBeNull();
    expect(await savedSecrets()).toMatchObject(secrets());
    expect((await readTenant(harness.service, harness.tenantId)).payments_config).toEqual(before);
  });

  // Live and test credentials are independent: a tenant cycles between sandbox and live over its
  // lifecycle, so a blank live key never wipes a filled-in test key. Unset is null in tenant_secrets.
  it("stores a blank secret as null, independently for live and test", async () => {
    await updatePaymentSecrets(harness.tenantId, secrets({ stripe_secret_key_live: "" }));
    expect(await savedSecrets()).toMatchObject({ stripe_secret_key_live: null, stripe_secret_key_test: "sk_test_1" });
  });

  it("leaves the DocuSeal key alone", async () => {
    await harness.service.from("tenant_secrets").update({ docuseal_key: "dk_keep" }).eq("tenant_id", harness.tenantId);
    await updatePaymentSecrets(harness.tenantId, secrets());
    expect((await savedSecrets()).docuseal_key).toBe("dk_keep");
  });

  itGuardsTheAction({
    harness, createClient, run: updatePaymentSecrets,
    validValues: () => secrets(),
    invalidValues: () => ({ stripe_secret_key_live: 5 }),
  });
});
