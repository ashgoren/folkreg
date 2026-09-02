"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { TextField } from "@/components/form-text-field";
import { SecretInput } from "@/components/ui/secret-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaymentsValues } from "./schema";

export function StripeCredentials({ form }: { form: UseFormReturn<PaymentsValues> }) {
  return (
    <FieldGroup>
      <TextField control={form.control} name="statementDescriptorSuffix" id="payments-statement-suffix" label="Statement descriptor suffix" autoComplete="off" />

      <Tabs defaultValue="live">
        <TabsList className="w-full">
          <TabsTrigger value="live" className="flex-1">Live</TabsTrigger>
          <TabsTrigger value="test" className="flex-1">Test</TabsTrigger>
        </TabsList>

        <TabsContent value="live">
          <FieldGroup className="rounded-lg border bg-muted/40 p-4">
            <Controller name="stripePublishableKeyLive" control={form.control} render={({ field }) => (
              <Field>
                <FormLabel htmlFor="payments-stripe-publishable-live">Publishable key (Live)</FormLabel>
                <SecretInput {...field} id="payments-stripe-publishable-live" />
              </Field>
            )} />
            <Controller name="stripe_secret_key_live" control={form.control} render={({ field }) => (
              <Field>
                <FormLabel htmlFor="payments-stripe-secret-live">Secret key (Live)</FormLabel>
                <SecretInput {...field} id="payments-stripe-secret-live" />
              </Field>
            )} />
            <Controller name="stripe_webhook_secret_live" control={form.control} render={({ field }) => (
              <Field>
                <FormLabel htmlFor="payments-stripe-webhook-live">Webhook secret (Live)</FormLabel>
                <SecretInput {...field} id="payments-stripe-webhook-live" />
              </Field>
            )} />
          </FieldGroup>
        </TabsContent>

        <TabsContent value="test">
          <FieldGroup className="rounded-lg border bg-muted/40 p-4">
            <Controller name="stripePublishableKeyTest" control={form.control} render={({ field }) => (
              <Field>
                <FormLabel htmlFor="payments-stripe-publishable-test">Publishable key (Test)</FormLabel>
                <SecretInput {...field} id="payments-stripe-publishable-test" />
              </Field>
            )} />
            <Controller name="stripe_secret_key_test" control={form.control} render={({ field }) => (
              <Field>
                <FormLabel htmlFor="payments-stripe-secret-test">Secret key (Test)</FormLabel>
                <SecretInput {...field} id="payments-stripe-secret-test" />
              </Field>
            )} />
            <Controller name="stripe_webhook_secret_test" control={form.control} render={({ field }) => (
              <Field>
                <FormLabel htmlFor="payments-stripe-webhook-test">Webhook secret (Test)</FormLabel>
                <SecretInput {...field} id="payments-stripe-webhook-test" />
              </Field>
            )} />
          </FieldGroup>
        </TabsContent>
      </Tabs>
    </FieldGroup>
  );
}
