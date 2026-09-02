"use client";

import { Controller, type UseFormReturn } from "react-hook-form";
import { Field, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { SecretInput } from "@/components/ui/secret-input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PaymentsValues } from "./schema";

export function PaypalCredentials({ form }: { form: UseFormReturn<PaymentsValues> }) {
  return (
    <Tabs defaultValue="live">
      <TabsList className="w-full">
        <TabsTrigger value="live" className="flex-1">Live</TabsTrigger>
        <TabsTrigger value="test" className="flex-1">Test</TabsTrigger>
      </TabsList>

      <TabsContent value="live">
        <FieldGroup className="rounded-lg border bg-muted/40 p-4">
          <Controller name="paypalClientIdLive" control={form.control} render={({ field }) => (
            <Field>
              <FormLabel htmlFor="payments-paypal-client-id-live">Client ID (Live)</FormLabel>
              <SecretInput {...field} id="payments-paypal-client-id-live" />
            </Field>
          )} />
          <Controller name="paypal_secret_live" control={form.control} render={({ field }) => (
            <Field>
              <FormLabel htmlFor="payments-paypal-secret-live">Secret (Live)</FormLabel>
              <SecretInput {...field} id="payments-paypal-secret-live" />
            </Field>
          )} />
          <Controller name="paypal_webhook_id_live" control={form.control} render={({ field }) => (
            <Field>
              <FormLabel htmlFor="payments-paypal-webhook-live">Webhook ID (Live)</FormLabel>
              <SecretInput {...field} id="payments-paypal-webhook-live" />
            </Field>
          )} />
        </FieldGroup>
      </TabsContent>

      <TabsContent value="test">
        <FieldGroup className="rounded-lg border bg-muted/40 p-4">
          <Controller name="paypalClientIdTest" control={form.control} render={({ field }) => (
            <Field>
              <FormLabel htmlFor="payments-paypal-client-id-test">Client ID (Test)</FormLabel>
              <SecretInput {...field} id="payments-paypal-client-id-test" />
            </Field>
          )} />
          <Controller name="paypal_secret_test" control={form.control} render={({ field }) => (
            <Field>
              <FormLabel htmlFor="payments-paypal-secret-test">Secret (Test)</FormLabel>
              <SecretInput {...field} id="payments-paypal-secret-test" />
            </Field>
          )} />
          <Controller name="paypal_webhook_id_test" control={form.control} render={({ field }) => (
            <Field>
              <FormLabel htmlFor="payments-paypal-webhook-test">Webhook ID (Test)</FormLabel>
              <SecretInput {...field} id="payments-paypal-webhook-test" />
            </Field>
          )} />
        </FieldGroup>
      </TabsContent>
    </Tabs>
  );
}
