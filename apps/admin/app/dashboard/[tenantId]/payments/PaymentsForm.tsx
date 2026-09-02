"use client";

import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AutosaveStatus } from "@/components/autosave-status";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import { NumberField } from "@/components/form-number-field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAutosave } from "@/lib/useAutosave";
import type { Tenant, TenantSecrets } from "@repo/types";
import { paymentsSchema, sharedSchema, type PaymentsValues, type PaymentsSharedValues } from "./schema";
import { updatePayments } from "./actions";
import { StripeCredentials } from "./StripeCredentials";
import { PaypalCredentials } from "./PaypalCredentials";

const defaultShared: PaymentsSharedValues = {
  paymentDueDate: "",
  directPaymentUrl: "",
  coverFeesCheckbox: false,
  showPaymentSummary: true,
  deposit: { enabled: false, amount: NaN },
  donation: { enabled: false, max: NaN },
  checks: { allowed: false, showPostalAddress: false, payee: "", address: "" },
};

function getDefaultsForProcessor(processor: PaymentsValues["processor"], shared: PaymentsSharedValues): PaymentsValues {
  switch (processor) {
    case "stripe":
      return {
        processor,
        stripePublishableKeyLive: "",
        stripePublishableKeyTest: "",
        stripe_secret_key_live: "",
        stripe_webhook_secret_live: "",
        stripe_secret_key_test: "",
        stripe_webhook_secret_test: "",
        statementDescriptorSuffix: "",
        ...shared,
      };
    case "paypal":
      return {
        processor,
        paypalClientIdLive: "",
        paypalClientIdTest: "",
        paypal_secret_live: "",
        paypal_webhook_id_live: "",
        paypal_secret_test: "",
        paypal_webhook_id_test: "",
        ...shared,
      };
  }
}

function extractShared(values: PaymentsValues): PaymentsSharedValues {
  return sharedSchema.parse(values);
}

function toFormValues(tenant: Tenant, secrets: TenantSecrets): PaymentsValues {
  const config = tenant.payments_config;
  if (!config) return getDefaultsForProcessor("stripe", defaultShared);

  const shared: PaymentsSharedValues = {
    paymentDueDate: config.paymentDueDate ?? "",
    directPaymentUrl: config.directPaymentUrl ?? "",
    coverFeesCheckbox: config.coverFeesCheckbox,
    showPaymentSummary: config.showPaymentSummary,
    deposit: { enabled: config.deposit.enabled, amount: config.deposit.amount },
    donation: { enabled: config.donation.enabled, max: config.donation.max },
    checks: {
      allowed: config.checks.allowed,
      showPostalAddress: config.checks.showPostalAddress ?? false,
      payee: config.checks.payee ?? "",
      address: config.checks.address ?? "",
    },
  };

  if (config.processor === "stripe") {
    return {
      processor: "stripe",
      stripePublishableKeyLive: config.stripePublishableKeyLive ?? "",
      stripePublishableKeyTest: config.stripePublishableKeyTest ?? "",
      stripe_secret_key_live: secrets.stripe_secret_key_live ?? "",
      stripe_webhook_secret_live: secrets.stripe_webhook_secret_live ?? "",
      stripe_secret_key_test: secrets.stripe_secret_key_test ?? "",
      stripe_webhook_secret_test: secrets.stripe_webhook_secret_test ?? "",
      statementDescriptorSuffix: config.statementDescriptorSuffix ?? "",
      ...shared,
    };
  }
  return {
    processor: "paypal",
    paypalClientIdLive: config.paypalClientIdLive ?? "",
    paypalClientIdTest: config.paypalClientIdTest ?? "",
    paypal_secret_live: secrets.paypal_secret_live ?? "",
    paypal_webhook_id_live: secrets.paypal_webhook_id_live ?? "",
    paypal_secret_test: secrets.paypal_secret_test ?? "",
    paypal_webhook_id_test: secrets.paypal_webhook_id_test ?? "",
    ...shared,
  };
}

export function PaymentsForm({ tenant, secrets }: { tenant: Tenant; secrets: TenantSecrets }) {
  const form = useForm<PaymentsValues>({
    mode: "onBlur",
    resolver: zodResolver(paymentsSchema),
    defaultValues: toFormValues(tenant, secrets),
  });

  const { saveDebounced, isPending, savedRecently } = useAutosave<PaymentsValues>(
    (data) => updatePayments(tenant.id, data),
  );

  useEffect(() => {
    const subscription = form.watch((values) => {
      const parsed = paymentsSchema.safeParse(values);
      if (!parsed.success) return;
      saveDebounced(parsed.data);
    });
    return () => subscription.unsubscribe();
  }, [form, saveDebounced]);

  const processor = form.watch("processor");

  const processorCache = useRef<Partial<Record<PaymentsValues["processor"], PaymentsValues>>>({});

  function handleProcessorChange(newProcessor: PaymentsValues["processor"]) {
    const current = form.getValues();
    processorCache.current[current.processor] = current;

    const shared = extractShared(current);
    const cached = processorCache.current[newProcessor];
    form.reset(cached ? { ...cached, ...shared } : getDefaultsForProcessor(newProcessor, shared));
  }

  const depositEnabled = form.watch("deposit.enabled");
  const donationEnabled = form.watch("donation.enabled");
  const checksAllowed = form.watch("checks.allowed");
  const showPostalAddress = form.watch("checks.showPostalAddress");

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
      <FieldGroup>
        <Controller name="processor" control={form.control} render={({ field }) => (
          <RadioGroup value={field.value} onValueChange={(value) => handleProcessorChange(value as PaymentsValues["processor"])}>
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
        <Controller name="directPaymentUrl" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="payments-direct-url">Direct payment URL</FormLabel>
            <Input {...field} id="payments-direct-url" autoComplete="url" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />
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
        <Controller name="deposit.enabled" control={form.control} render={({ field, fieldState }) => (
          <Field orientation="horizontal" data-invalid={fieldState.invalid}>
            <FieldContent>
              <FormLabel htmlFor="payments-deposit-enabled">Allow deposit?</FormLabel>
            </FieldContent>
            <Switch id="payments-deposit-enabled" checked={field.value} onCheckedChange={field.onChange} aria-invalid={fieldState.invalid} />
          </Field>
        )} />

        {depositEnabled && (
          <>
            <NumberField control={form.control} name="deposit.amount" id="payments-deposit-amount" label="Deposit amount" />
            <Controller name="paymentDueDate" control={form.control} render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FormLabel htmlFor="payments-due-date">Balance due date</FormLabel>
                <Input {...field} id="payments-due-date" aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )} />
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
            <Switch id="payments-donation-enabled" checked={field.value} onCheckedChange={field.onChange} aria-invalid={fieldState.invalid} />
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
                <Controller name="checks.payee" control={form.control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FormLabel htmlFor="payments-checks-payee">Payee name</FormLabel>
                    <Input {...field} id="payments-checks-payee" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />

                <Controller name="checks.address" control={form.control} render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FormLabel htmlFor="payments-checks-address">Mailing address</FormLabel>
                    <Input {...field} id="payments-checks-address" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )} />
              </>
            )}
          </>
        )}
      </FieldGroup>

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
