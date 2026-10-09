"use client";

import { Controller, useWatch } from "react-hook-form";
import { AutosaveStatus } from "@/components/autosave-status";
import { Field, FieldContent, FieldDescription, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { NumberField } from "@/components/form-number-field";
import { TextField } from "@/components/form-text-field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import type { Tenant, TenantSecrets } from "@repo/types";
import { paymentsSchema, type PaymentsValues } from "./schema";
import { updatePayments } from "./actions";
import { StripeCredentials } from "./StripeCredentials";
import { PaypalCredentials } from "./PaypalCredentials";

// The stored payments_config plus the credential secrets, which live in tenant_secrets (where an
// unset column is null; the form's blank is "").
const toFormValues = (tenant: Tenant, secrets: TenantSecrets): PaymentsValues => ({
  ...tenant.payments_config,
  stripe_secret_key_live: secrets.stripe_secret_key_live ?? "",
  stripe_webhook_secret_live: secrets.stripe_webhook_secret_live ?? "",
  stripe_secret_key_test: secrets.stripe_secret_key_test ?? "",
  stripe_webhook_secret_test: secrets.stripe_webhook_secret_test ?? "",
  paypal_secret_live: secrets.paypal_secret_live ?? "",
  paypal_webhook_id_live: secrets.paypal_webhook_id_live ?? "",
  paypal_secret_test: secrets.paypal_secret_test ?? "",
  paypal_webhook_id_test: secrets.paypal_webhook_id_test ?? "",
});

export function PaymentsForm({ tenant, secrets }: { tenant: Tenant; secrets: TenantSecrets }) {
  const { form, formProps, isPending, savedRecently } = useAutosaveForm({
    label: "Payments",
    schema: paymentsSchema,
    defaultValues: toFormValues(tenant, secrets),
    save: (data) => updatePayments(tenant.id, data),
  });

  // Only the active processor's credentials are shown; the other's stay in the form (and are
  // saved) as they were.
  const processor = useWatch({ control: form.control, name: "processor" });

  const depositEnabled = useWatch({ control: form.control, name: "deposit.enabled" });
  const donationEnabled = useWatch({ control: form.control, name: "donation.enabled" });
  const checksAllowed = useWatch({ control: form.control, name: "checks.allowed" });
  const showPostalAddress = useWatch({ control: form.control, name: "checks.showPostalAddress" });

  return (
    <form {...formProps} className="space-y-8">
      <FieldGroup>
        <Controller name="processor" control={form.control} render={({ field }) => (
          <RadioGroup value={field.value} onValueChange={field.onChange}>
            <Field orientation="horizontal">
              <RadioGroupItem value="stripe" id="payments-processor-stripe" />
              <FieldContent>
                <FormLabel htmlFor="payments-processor-stripe">Stripe</FormLabel>
              </FieldContent>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="paypal" id="payments-processor-paypal" />
              <FieldContent>
                <FormLabel htmlFor="payments-processor-paypal">PayPal</FormLabel>
              </FieldContent>
            </Field>
          </RadioGroup>
        )} />
      </FieldGroup>

      <Separator />

      {processor === "stripe" && <StripeCredentials form={form} />}
      {processor === "paypal" && <PaypalCredentials form={form} />}

      <Separator />

      <FieldGroup>
        <TextField control={form.control} name="directPaymentUrl" id="payments-direct-url" label="Direct payment URL" type="url" autoComplete="url" />
      </FieldGroup>

      <Separator />

      <FieldGroup>
        <Controller name="coverFeesCheckbox" control={form.control} render={({ field, fieldState }) => (
          <Field orientation="horizontal" data-invalid={fieldState.invalid}>
            <FieldContent>
              <FormLabel htmlFor="payments-cover-fees">Show &ldquo;cover fees&rdquo; option?</FormLabel>
            </FieldContent>
            <Switch id="payments-cover-fees" checked={field.value} onCheckedChange={field.onChange} aria-invalid={fieldState.invalid} />
          </Field>
        )} />

        <Controller name="showPaymentSummary" control={form.control} render={({ field, fieldState }) => (
          <Field orientation="horizontal" data-invalid={fieldState.invalid}>
            <FieldContent>
              <FormLabel htmlFor="payments-show-summary">Show payment summary?</FormLabel>
            </FieldContent>
            <Switch id="payments-show-summary" checked={field.value} onCheckedChange={field.onChange} aria-invalid={fieldState.invalid} />
          </Field>
        )} />
      </FieldGroup>

      <Separator />

      <FieldGroup>
        {/* Turning deposits (or donations) off hides the amount field, so the switch waits until that
            field is valid -- a hidden error would block every later save with nothing on screen to
            explain it. Same rule as the Admissions mode switch. */}
        <Controller name="deposit.enabled" control={form.control} render={({ field, fieldState }) => (
          <Field orientation="horizontal" data-invalid={fieldState.invalid}>
            <FieldContent>
              <FormLabel htmlFor="payments-deposit-enabled">Allow deposit?</FormLabel>
            </FieldContent>
            <Switch
              id="payments-deposit-enabled"
              checked={field.value}
              onCheckedChange={async (checked) => { if (checked || await form.trigger("deposit.amount")) field.onChange(checked); }}
              aria-invalid={fieldState.invalid}
            />
          </Field>
        )} />

        {depositEnabled && (
          <>
            <NumberField control={form.control} name="deposit.amount" id="payments-deposit-amount" label="Deposit amount" />
            <TextField control={form.control} name="paymentDueDate" id="payments-due-date" label="Balance due date" autoComplete="off" />
          </>
        )}
      </FieldGroup>

      <Separator />

      <FieldGroup>
        <Controller name="donation.enabled" control={form.control} render={({ field, fieldState }) => (
          <Field orientation="horizontal" data-invalid={fieldState.invalid}>
            <FieldContent>
              <FormLabel htmlFor="payments-donation-enabled">Allow donation?</FormLabel>
            </FieldContent>
            <Switch
              id="payments-donation-enabled"
              checked={field.value}
              onCheckedChange={async (checked) => { if (checked || await form.trigger("donation.max")) field.onChange(checked); }}
              aria-invalid={fieldState.invalid}
            />
          </Field>
        )} />

        {donationEnabled && (
          <NumberField control={form.control} name="donation.max" id="payments-donation-max" label="Maximum donation" />
        )}
      </FieldGroup>

      <Separator />

      <FieldGroup>
        <Controller name="checks.allowed" control={form.control} render={({ field, fieldState }) => (
          <Field orientation="horizontal" data-invalid={fieldState.invalid}>
            <FieldContent>
              <FormLabel htmlFor="payments-checks-allowed">Allow payment by check?</FormLabel>
            </FieldContent>
            <Switch id="payments-checks-allowed" checked={field.value} onCheckedChange={field.onChange} aria-invalid={fieldState.invalid} />
          </Field>
        )} />

        {checksAllowed && (
          <>
            <Controller name="checks.showPostalAddress" control={form.control} render={({ field }) => (
              <RadioGroup value={field.value ? "address" : "email"} onValueChange={(value) => field.onChange(value === "address")}>
                <Field orientation="horizontal">
                  <RadioGroupItem value="email" id="payments-checks-contact-email" />
                  <FieldContent>
                    <FormLabel htmlFor="payments-checks-contact-email">Email</FormLabel>
                    <FieldDescription>Registrants are told to email for check-mailing instructions</FieldDescription>
                  </FieldContent>
                </Field>
                <Field orientation="horizontal">
                  <RadioGroupItem value="address" id="payments-checks-contact-address" />
                  <FieldContent>
                    <FormLabel htmlFor="payments-checks-contact-address">Mailing address</FormLabel>
                    <FieldDescription>Registrants are shown the check mailing address</FieldDescription>
                  </FieldContent>
                </Field>
              </RadioGroup>
            )} />

            {showPostalAddress && (
              <>
                <TextField control={form.control} name="checks.payee" id="payments-checks-payee" label="Payee name" autoComplete="off" />

                <TextField control={form.control} name="checks.address" id="payments-checks-address" label="Mailing address" autoComplete="off" />
              </>
            )}
          </>
        )}
      </FieldGroup>

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
