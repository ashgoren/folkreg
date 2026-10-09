// Covers PaymentsForm together with StripeCredentials/PaypalCredentials, which only exist as
// pieces of this form's state.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeSecrets, makeTenant } from "@/test/fixtures";
import { expectLastSave, expectNoSave } from "@/test/autosave";
import { defaultPaymentsConfig } from "@repo/tenant-config";
import type { PaymentsConfig } from "@repo/tenant-config";

vi.mock("./actions", () => ({ updatePayments: vi.fn() }));
import { updatePayments } from "./actions";
import { PaymentsForm } from "./PaymentsForm";
import type { PaymentsValues } from "./schema";

const byId = (id: string) => document.getElementById(id) as HTMLInputElement;

// What a new tenant's form starts with, and so what an edit to it saves: the default
// payments_config plus blank secrets.
const BLANK: PaymentsValues = {
  ...defaultPaymentsConfig(),
  stripe_secret_key_live: "",
  stripe_webhook_secret_live: "",
  stripe_secret_key_test: "",
  stripe_webhook_secret_test: "",
  paypal_secret_live: "",
  paypal_webhook_id_live: "",
  paypal_secret_test: "",
  paypal_webhook_id_test: "",
};

const storedConfig = (overrides: Partial<PaymentsConfig> = {}): PaymentsConfig => ({
  ...defaultPaymentsConfig(),
  stripePublishableKeyLive: "pk_live",
  stripePublishableKeyTest: "pk_test",
  paymentDueDate: "May 1",
  directPaymentUrl: "https://example.com/pay",
  coverFeesCheckbox: true,
  showPaymentSummary: false,
  deposit: { enabled: true, amount: 50 },
  donation: { enabled: true, max: 200 },
  checks: { allowed: true, showPostalAddress: true, payee: "Example Dance Society", address: "1 Main St" },
  statementDescriptorSuffix: "SPRING",
  ...overrides,
});

describe("PaymentsForm", () => {
  beforeEach(() => {
    vi.mocked(updatePayments).mockReset().mockResolvedValue(null);
  });

  describe("initial state", () => {
    it("defaults a new tenant to Stripe with every optional section collapsed", () => {
      render(<PaymentsForm tenant={makeTenant()} secrets={makeSecrets()} />);

      expect(screen.getByRole("radio", { name: "Stripe" })).toBeChecked();
      expect(screen.getByLabelText("Statement descriptor suffix")).toHaveValue("");
      expect(screen.getByRole("tab", { name: "Live" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("switch", { name: /payment summary/ })).toBeChecked();
      expect(screen.getByRole("switch", { name: /cover fees/ })).not.toBeChecked();
      expect(byId("payments-deposit-amount")).toBeNull();
      expect(byId("payments-due-date")).toBeNull();
      expect(byId("payments-donation-max")).toBeNull();
      expect(screen.queryByRole("radio", { name: "Mailing address" })).not.toBeInTheDocument();
    });

    it("populates a stored Stripe config, merging publishable keys from config with secrets", async () => {
      const user = userEvent.setup();
      render(
        <PaymentsForm
          tenant={makeTenant({ payments_config: storedConfig() })}
          secrets={makeSecrets({ stripe_secret_key_live: "sk_live", stripe_webhook_secret_test: "whsec_test" })}
        />,
      );

      expect(screen.getByLabelText("Statement descriptor suffix")).toHaveValue("SPRING");
      expect(screen.getByLabelText("Publishable key (Live)")).toHaveValue("pk_live");
      expect(screen.getByLabelText("Secret key (Live)")).toHaveValue("sk_live");
      expect(byId("payments-deposit-amount")).toHaveValue(50);
      expect(byId("payments-due-date")).toHaveValue("May 1");
      expect(byId("payments-donation-max")).toHaveValue(200);
      expect(screen.getByRole("radio", { name: "Mailing address" })).toBeChecked();
      expect(byId("payments-checks-payee")).toHaveValue("Example Dance Society");

      await user.click(screen.getByRole("tab", { name: "Test" }));
      expect(screen.getByLabelText("Publishable key (Test)")).toHaveValue("pk_test");
      expect(screen.getByLabelText("Webhook secret (Test)")).toHaveValue("whsec_test");
    });

    it("populates a stored PayPal config", () => {
      render(
        <PaymentsForm
          tenant={makeTenant({ payments_config: storedConfig({ processor: "paypal", paypalClientIdLive: "client_live" }) })}
          secrets={makeSecrets({ paypal_secret_live: "secret_live" })}
        />,
      );
      expect(screen.getByRole("radio", { name: "PayPal" })).toBeChecked();
      expect(screen.queryByLabelText("Statement descriptor suffix")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Client ID (Live)")).toHaveValue("client_live");
      expect(screen.getByLabelText("Secret (Live)")).toHaveValue("secret_live");
    });

    it("renders every credential masked", () => {
      render(<PaymentsForm tenant={makeTenant()} secrets={makeSecrets()} />);
      for (const label of ["Publishable key (Live)", "Secret key (Live)", "Webhook secret (Live)"]) {
        expect(screen.getByLabelText(label)).toHaveAttribute("type", "password");
      }
    });
  });

  describe("credentials", () => {
    it("saves live and test Stripe credentials together, whichever tab is showing", async () => {
      const tenant = makeTenant();
      const user = userEvent.setup();
      render(<PaymentsForm tenant={tenant} secrets={makeSecrets()} />);

      await user.type(screen.getByLabelText("Secret key (Live)"), "sk_live");
      await user.click(screen.getByRole("tab", { name: "Test" }));
      // Radix unmounts inactive tab panels; the live values survive in react-hook-form state.
      expect(screen.queryByLabelText("Secret key (Live)")).not.toBeInTheDocument();
      await user.type(screen.getByLabelText("Secret key (Test)"), "sk_test");
      await user.tab();

      await expectLastSave(vi.mocked(updatePayments), tenant.id, {
        ...BLANK, stripe_secret_key_live: "sk_live", stripe_secret_key_test: "sk_test",
      });

      await user.click(screen.getByRole("tab", { name: "Live" }));
      expect(screen.getByLabelText("Secret key (Live)")).toHaveValue("sk_live");
    });

    it("saves PayPal credentials across both tabs", async () => {
      const tenant = makeTenant({ payments_config: storedConfig({ processor: "paypal" }) });
      const user = userEvent.setup();
      render(<PaymentsForm tenant={tenant} secrets={makeSecrets()} />);

      await user.type(screen.getByLabelText("Webhook ID (Live)"), "wh_live");
      await user.click(screen.getByRole("tab", { name: "Test" }));
      await user.type(screen.getByLabelText("Client ID (Test)"), "client_test");
      await user.tab();

      await expectLastSave(vi.mocked(updatePayments), tenant.id, expect.objectContaining({
        processor: "paypal", paypal_webhook_id_live: "wh_live", paypalClientIdTest: "client_test",
      }));
    });
  });

  describe("switching processors", () => {
    // Only the processor changes: the other processor's credentials stay in the form and in the
    // save, so an accidental click on the other processor loses nothing.
    it("shows the new processor's credentials and keeps the previous one's in the save", async () => {
      const tenant = makeTenant();
      const user = userEvent.setup();
      render(<PaymentsForm tenant={tenant} secrets={makeSecrets()} />);

      await user.click(screen.getByRole("switch", { name: /cover fees/ }));
      await user.type(screen.getByLabelText("Secret key (Live)"), "sk_live");
      await user.click(screen.getByRole("radio", { name: "PayPal" }));

      expect(screen.queryByLabelText("Secret key (Live)")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Client ID (Live)")).toHaveValue("");
      expect(screen.getByRole("switch", { name: /cover fees/ })).toBeChecked();
      await expectLastSave(vi.mocked(updatePayments), tenant.id, {
        ...BLANK, processor: "paypal", stripe_secret_key_live: "sk_live", coverFeesCheckbox: true,
      });
    });

    it("shows each processor's values again when switching back", async () => {
      const user = userEvent.setup();
      render(<PaymentsForm tenant={makeTenant()} secrets={makeSecrets()} />);

      await user.type(screen.getByLabelText("Secret key (Live)"), "sk_live");
      await user.click(screen.getByRole("radio", { name: "PayPal" }));
      await user.type(screen.getByLabelText("Client ID (Live)"), "client_live");
      await user.click(screen.getByRole("radio", { name: "Stripe" }));
      expect(screen.getByLabelText("Secret key (Live)")).toHaveValue("sk_live");

      await user.click(screen.getByRole("radio", { name: "PayPal" }));
      expect(screen.getByLabelText("Client ID (Live)")).toHaveValue("client_live");
    });
  });

  describe("optional sections", () => {
    it("reveals deposit amount and balance due date only while deposits are allowed", async () => {
      const tenant = makeTenant();
      const user = userEvent.setup();
      render(<PaymentsForm tenant={tenant} secrets={makeSecrets()} />);

      await user.click(screen.getByRole("switch", { name: /Allow deposit/ }));
      await user.type(byId("payments-deposit-amount"), "25");
      await user.type(byId("payments-due-date"), "June 1");
      await user.tab();

      await expectLastSave(vi.mocked(updatePayments), tenant.id, {
        ...BLANK, deposit: { enabled: true, amount: 25 }, paymentDueDate: "June 1",
      });

      await user.click(screen.getByRole("switch", { name: /Allow deposit/ }));
      expect(byId("payments-deposit-amount")).toBeNull();
      expect(byId("payments-due-date")).toBeNull();
      await expectLastSave(vi.mocked(updatePayments), tenant.id, expect.objectContaining({ deposit: { enabled: false, amount: 25 } }));
    });

    it("reveals the donation max only while donations are allowed", async () => {
      const tenant = makeTenant();
      const user = userEvent.setup();
      render(<PaymentsForm tenant={tenant} secrets={makeSecrets()} />);

      await user.click(screen.getByRole("switch", { name: /Allow donation/ }));
      await user.type(byId("payments-donation-max"), "500");
      await user.tab();
      await expectLastSave(vi.mocked(updatePayments), tenant.id, expect.objectContaining({ donation: { enabled: true, max: 500 } }));
    });

    it("rejects a negative deposit amount", async () => {
      const user = userEvent.setup();
      render(<PaymentsForm tenant={makeTenant({ payments_config: storedConfig() })} secrets={makeSecrets()} />);

      await user.clear(byId("payments-deposit-amount"));
      await user.type(byId("payments-deposit-amount"), "-5");
      await user.tab();

      expect(byId("payments-deposit-amount")).toHaveAttribute("aria-invalid", "true");
      await expectNoSave(vi.mocked(updatePayments));
    });

    // Turning deposits off would hide the invalid amount while its error still blocked every
    // save, so the switch waits for the error to be fixed.
    it("keeps deposits on while the deposit amount has an error", async () => {
      const user = userEvent.setup();
      render(<PaymentsForm tenant={makeTenant({ payments_config: storedConfig() })} secrets={makeSecrets()} />);

      await user.clear(byId("payments-deposit-amount"));
      await user.click(screen.getByRole("switch", { name: /Allow deposit/ }));

      expect(screen.getByRole("switch", { name: /Allow deposit/ })).toBeChecked();
      expect(byId("payments-deposit-amount")).toHaveAttribute("aria-invalid", "true");
      await expectNoSave(vi.mocked(updatePayments));
    });

    it("walks check payments from allowed -> email vs. mailing address -> payee and address", async () => {
      const tenant = makeTenant();
      const user = userEvent.setup();
      render(<PaymentsForm tenant={tenant} secrets={makeSecrets()} />);

      await user.click(screen.getByRole("switch", { name: /payment by check/ }));
      expect(screen.getByRole("radio", { name: "Email" })).toBeChecked();
      expect(byId("payments-checks-payee")).toBeNull();

      await user.click(screen.getByRole("radio", { name: "Mailing address" }));
      await user.type(byId("payments-checks-payee"), "Example Dance Society");
      await user.type(byId("payments-checks-address"), "1 Main St");
      await user.tab();

      await expectLastSave(vi.mocked(updatePayments), tenant.id, expect.objectContaining({
        checks: { allowed: true, showPostalAddress: true, payee: "Example Dance Society", address: "1 Main St" },
      }));

      await user.click(screen.getByRole("radio", { name: "Email" }));
      expect(byId("payments-checks-payee")).toBeNull();
      await expectLastSave(vi.mocked(updatePayments), tenant.id, expect.objectContaining({
        checks: { allowed: true, showPostalAddress: false, payee: "Example Dance Society", address: "1 Main St" },
      }));
    });
  });
});
