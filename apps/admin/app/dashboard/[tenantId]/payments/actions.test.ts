import { describe, it, expect, vi } from "vitest";
import { readSecrets, readTenant } from "@/test/supabase";
import { itGuardsTheAction, useActionHarness } from "@/test/action-harness";

// See general/actions.test.ts for why only the server client factory is mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { updatePayments } from "./actions";
import type { PaymentsSharedValues, PaymentsValues } from "./schema";

const shared = (overrides: Partial<PaymentsSharedValues> = {}): PaymentsSharedValues => ({
  paymentDueDate: "",
  directPaymentUrl: "",
  coverFeesCheckbox: false,
  showPaymentSummary: true,
  deposit: { enabled: false, amount: NaN },
  donation: { enabled: false, max: NaN },
  checks: { allowed: false, showPostalAddress: false, payee: "", address: "" },
  ...overrides,
});

const stripe = (overrides: Partial<Extract<PaymentsValues, { processor: "stripe" }>> = {}): PaymentsValues => ({
  processor: "stripe",
  stripePublishableKeyLive: "pk_live_1",
  stripePublishableKeyTest: "pk_test_1",
  stripe_secret_key_live: "sk_live_1",
  stripe_webhook_secret_live: "whsec_live_1",
  stripe_secret_key_test: "sk_test_1",
  stripe_webhook_secret_test: "whsec_test_1",
  statementDescriptorSuffix: "DANCE",
  ...shared(),
  ...overrides,
});

const paypal = (overrides: Partial<Extract<PaymentsValues, { processor: "paypal" }>> = {}): PaymentsValues => ({
  processor: "paypal",
  paypalClientIdLive: "client_live_1",
  paypalClientIdTest: "client_test_1",
  paypal_secret_live: "pp_secret_live_1",
  paypal_webhook_id_live: "wh_live_1",
  paypal_secret_test: "pp_secret_test_1",
  paypal_webhook_id_test: "wh_test_1",
  ...shared(),
  ...overrides,
});

describe("updatePayments", () => {
  const harness = useActionHarness(createClient);
  const savedConfig = async () => (await readTenant(harness.service, harness.tenantId)).payments_config;
  const savedSecrets = async () => readSecrets(harness.service, harness.tenantId);

  // Publishable keys/client IDs are public by design and live in payments_config; secret keys
  // and webhook secrets go to tenant_secrets.
  it("splits Stripe's public keys into payments_config and its secrets into tenant_secrets", async () => {
    expect(await updatePayments(harness.tenantId, stripe())).toBeNull();

    expect(await savedConfig()).toMatchObject({
      processor: "stripe",
      stripePublishableKeyLive: "pk_live_1",
      stripePublishableKeyTest: "pk_test_1",
      statementDescriptorSuffix: "DANCE",
      paypalClientIdLive: null,
      paypalClientIdTest: null,
    });
    expect(await savedSecrets()).toMatchObject({
      stripe_secret_key_live: "sk_live_1",
      stripe_webhook_secret_live: "whsec_live_1",
      stripe_secret_key_test: "sk_test_1",
      stripe_webhook_secret_test: "whsec_test_1",
    });
  });

  it("never copies a secret into the readable payments_config column", async () => {
    await updatePayments(harness.tenantId, stripe());
    await updatePayments(harness.tenantId, paypal());
    const config = JSON.stringify(await savedConfig());
    for (const secret of ["sk_live_1", "whsec_live_1", "pp_secret_live_1", "wh_live_1", "pp_secret_test_1"]) {
      expect(config).not.toContain(secret);
    }
  });

  it("saves PayPal's client IDs and secrets", async () => {
    await updatePayments(harness.tenantId, paypal());
    expect(await savedConfig()).toMatchObject({ processor: "paypal", paypalClientIdLive: "client_live_1", paypalClientIdTest: "client_test_1" });
    expect(await savedSecrets()).toMatchObject({
      paypal_secret_live: "pp_secret_live_1",
      paypal_webhook_id_live: "wh_live_1",
      paypal_secret_test: "pp_secret_test_1",
      paypal_webhook_id_test: "wh_test_1",
    });
  });

  // Only the active processor's credentials are ever persisted -- switching processors
  // destroys the previous one's, rather than silently retaining both forever.
  it("nulls out every Stripe credential when switching to PayPal", async () => {
    await updatePayments(harness.tenantId, stripe());
    await updatePayments(harness.tenantId, paypal());

    expect(await savedConfig()).toMatchObject({ stripePublishableKeyLive: null, stripePublishableKeyTest: null, statementDescriptorSuffix: null });
    expect(await savedSecrets()).toMatchObject({
      stripe_secret_key_live: null,
      stripe_webhook_secret_live: null,
      stripe_secret_key_test: null,
      stripe_webhook_secret_test: null,
    });
  });

  it("nulls out every PayPal credential when switching to Stripe", async () => {
    await updatePayments(harness.tenantId, paypal());
    await updatePayments(harness.tenantId, stripe());

    expect(await savedConfig()).toMatchObject({ paypalClientIdLive: null, paypalClientIdTest: null });
    expect(await savedSecrets()).toMatchObject({
      paypal_secret_live: null,
      paypal_webhook_id_live: null,
      paypal_secret_test: null,
      paypal_webhook_id_test: null,
    });
  });

  // Live and test credentials are independent: a tenant cycles between sandbox and live over
  // its lifecycle, so a blank live key never wipes a filled-in test key or vice versa.
  it("stores blank credentials as null, independently for live and test", async () => {
    await updatePayments(harness.tenantId, stripe({ stripe_secret_key_live: "", stripePublishableKeyLive: "" }));
    expect(await savedSecrets()).toMatchObject({ stripe_secret_key_live: null, stripe_secret_key_test: "sk_test_1" });
    expect(await savedConfig()).toMatchObject({ stripePublishableKeyLive: null, stripePublishableKeyTest: "pk_test_1" });
  });

  it("leaves the DocuSeal key alone", async () => {
    await harness.service.from("tenant_secrets").update({ docuseal_key: "dk_keep" }).eq("tenant_id", harness.tenantId);
    await updatePayments(harness.tenantId, stripe());
    expect((await savedSecrets()).docuseal_key).toBe("dk_keep");
  });

  describe("shared settings", () => {
    // JSON has no NaN -- a cleared NumberField would otherwise serialize as null. The action
    // stores 0 instead so the column always holds a number.
    it("stores a cleared (NaN) deposit amount and donation max as 0", async () => {
      await updatePayments(harness.tenantId, stripe({ deposit: { enabled: true, amount: NaN }, donation: { enabled: true, max: NaN } }));
      expect(await savedConfig()).toMatchObject({ deposit: { enabled: true, amount: 0 }, donation: { enabled: true, max: 0 } });
    });

    it("saves deposit, donation, fee, summary, and direct-payment settings", async () => {
      await updatePayments(harness.tenantId, stripe({
        paymentDueDate: "May 1",
        directPaymentUrl: "https://example.org/pay",
        coverFeesCheckbox: true,
        showPaymentSummary: false,
        deposit: { enabled: true, amount: 50 },
        donation: { enabled: true, max: 200 },
      }));
      expect(await savedConfig()).toMatchObject({
        paymentDueDate: "May 1",
        directPaymentUrl: "https://example.org/pay",
        coverFeesCheckbox: true,
        showPaymentSummary: false,
        deposit: { enabled: true, amount: 50 },
        donation: { enabled: true, max: 200 },
      });
    });

    it("stores blank due date and direct-payment URL as null", async () => {
      await updatePayments(harness.tenantId, stripe());
      expect(await savedConfig()).toMatchObject({ paymentDueDate: null, directPaymentUrl: null });
    });

    // checks.address is stored exactly as entered (multi-line string, not split into lines);
    // parsing into display lines is the registration app's job.
    it("saves check settings with the address as entered", async () => {
      const address = "Folk Society\n123 Main St\nSpringfield, OR 97477";
      await updatePayments(harness.tenantId, stripe({ checks: { allowed: true, showPostalAddress: true, payee: "Folk Society", address } }));
      expect(await savedConfig()).toMatchObject({ checks: { allowed: true, showPostalAddress: true, payee: "Folk Society", address } });
    });

    // undefined keys are dropped by JSON serialization, so blank payee/address are absent
    // from the stored object rather than null or "".
    it("omits a blank payee and address", async () => {
      await updatePayments(harness.tenantId, stripe({ checks: { allowed: true, showPostalAddress: false, payee: "", address: "" } }));
      expect(await savedConfig()).toMatchObject({ checks: { allowed: true, showPostalAddress: false } });
      expect(await savedConfig()).not.toHaveProperty("checks.payee");
      expect(await savedConfig()).not.toHaveProperty("checks.address");
    });
  });

  itGuardsTheAction({
    harness, createClient, run: updatePayments,
    validValues: () => stripe(),
    invalidValues: () => stripe({ deposit: { enabled: true, amount: -10 } }),
  });
});
