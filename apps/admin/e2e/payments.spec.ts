import { test, expect, service, readTenantConfig, waitForSaved } from "./fixtures";
import { readSecrets } from "../test/supabase";

const paymentsConfig = async (tenantId: string) => (await readTenantConfig(tenantId)).payments_config;

test.beforeEach(async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("payments"));
});

test("saves Stripe credentials from both the Live and Test tabs", async ({ page, tenantId }) => {
  await expect(page.getByRole("radio", { name: "Stripe" })).toBeChecked();
  await page.getByLabel("Statement descriptor suffix").fill("FOLKREG");
  await page.getByLabel("Secret key (Live)").fill("sk_live_123");

  // Only one tab's inputs are mounted at a time, but both sets live in the same form state, so
  // switching tabs never drops what was typed in the other one.
  await page.getByRole("tab", { name: "Test" }).click();
  await page.getByLabel("Secret key (Test)").fill("sk_test_123");
  await page.getByLabel("Publishable key (Test)").fill("pk_test_123");
  await waitForSaved(page);

  await expect.poll(() => readSecrets(service, tenantId)).toMatchObject({
    stripe_secret_key_live: "sk_live_123",
    stripe_secret_key_test: "sk_test_123",
    stripe_webhook_secret_live: null,
  });
  await expect.poll(() => paymentsConfig(tenantId)).toMatchObject({
    processor: "stripe",
    statementDescriptorSuffix: "FOLKREG",
    stripePublishableKeyTest: "pk_test_123",
    stripePublishableKeyLive: "",
  });

  await page.reload();
  await expect(page.getByLabel("Secret key (Live)")).toHaveValue("sk_live_123");
  await page.getByRole("tab", { name: "Test" }).click();
  await expect(page.getByLabel("Secret key (Test)")).toHaveValue("sk_test_123");
});

// Switching processors only changes which one is active: the Stripe credentials stay saved, and
// are still there after a reload and a switch back.
test("switching to PayPal keeps the Stripe credentials", async ({ page, tenantId }) => {
  await page.getByLabel("Secret key (Live)").fill("sk_live_123");
  await expect.poll(async () => (await readSecrets(service, tenantId)).stripe_secret_key_live).toBe("sk_live_123");

  await page.getByRole("radio", { name: "PayPal" }).click();
  await page.getByLabel("Client ID (Live)").fill("paypal-client-live");
  await page.getByLabel("Secret (Live)").fill("paypal-secret-live");
  await waitForSaved(page);

  await expect.poll(() => readSecrets(service, tenantId)).toMatchObject({
    stripe_secret_key_live: "sk_live_123",
    paypal_secret_live: "paypal-secret-live",
  });
  await expect.poll(() => paymentsConfig(tenantId)).toMatchObject({ processor: "paypal", paypalClientIdLive: "paypal-client-live" });

  await page.reload();
  await expect(page.getByRole("radio", { name: "PayPal" })).toBeChecked();
  await expect(page.getByLabel("Client ID (Live)")).toHaveValue("paypal-client-live");
  await page.getByRole("radio", { name: "Stripe" }).click();
  await expect(page.getByLabel("Secret key (Live)")).toHaveValue("sk_live_123");
});

test("deposit, donation, and check options reveal and save their details", async ({ page, tenantId }) => {
  await expect(page.getByLabel("Deposit amount")).toBeHidden();
  await page.getByRole("switch", { name: "Allow deposit?" }).click();
  await page.getByLabel("Deposit amount").fill("50");
  await page.getByLabel("Balance due date").fill("September 1");

  await page.getByRole("switch", { name: "Allow donation?" }).click();
  await page.getByLabel("Maximum donation").fill("200");

  await page.getByRole("switch", { name: "Allow payment by check?" }).click();
  await expect(page.getByRole("radio", { name: "Email" })).toBeChecked();
  await expect(page.getByLabel("Payee name")).toBeHidden();
  await page.getByRole("radio", { name: "Mailing address" }).click();
  await page.getByLabel("Payee name").fill("Example Dance Society");
  // Exact match: the radio above it is also named "Mailing address".
  await page.getByRole("textbox", { name: "Mailing address", exact: true }).fill("123 Main St, Portland, OR");
  await waitForSaved(page);

  await expect.poll(() => paymentsConfig(tenantId)).toMatchObject({
    paymentDueDate: "September 1",
    deposit: { enabled: true, amount: 50 },
    donation: { enabled: true, max: 200 },
    checks: {
      allowed: true,
      showPostalAddress: true,
      payee: "Example Dance Society",
      address: "123 Main St, Portland, OR",
    },
  });

  await page.reload();
  await expect(page.getByLabel("Deposit amount")).toHaveValue("50");
  await expect(page.getByLabel("Maximum donation")).toHaveValue("200");
  await expect(page.getByLabel("Payee name")).toHaveValue("Example Dance Society");
});
