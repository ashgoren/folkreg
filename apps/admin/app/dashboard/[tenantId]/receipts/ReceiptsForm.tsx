"use client";

import { useEffect, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import type { Tenant } from "@repo/types";
import { receiptsSchema, type ReceiptsValues } from "./schema";
import { updateReceipts } from "./actions";

export function ReceiptsForm({ tenant }: { tenant: Tenant }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const receiptsConfig = tenant.receipts_config;

  const form = useForm<ReceiptsValues>({
    resolver: zodResolver(receiptsSchema),
    defaultValues: {
      emailFrom: receiptsConfig?.emailFrom ?? "",
      emailReplyTo: receiptsConfig?.emailReplyTo ?? "",
    },
  });

  const isDirty = form.formState.isDirty;
  useEffect(() => { if (isDirty) setSaved(false) }, [isDirty]);

  function onSubmit(values: ReceiptsValues) {
    setSaved(false);
    startTransition(async () => {
      const error = await updateReceipts(tenant.id, values);
      if (error) {
        form.setError("root", { message: error });
      } else {
        form.reset(values);
        setSaved(true);
      }
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

      <FieldGroup>
        <Controller name="emailFrom" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="receipts-email-from">From address</FormLabel>
            <FieldDescription>Sender address for confirmation emails</FieldDescription>
            <Input {...field} id="receipts-email-from" type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />

        <Controller name="emailReplyTo" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="receipts-email-reply-to">Reply-to address</FormLabel>
            <FieldDescription>Where registrant replies go</FieldDescription>
            <Input {...field} id="receipts-email-reply-to" type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />
      </FieldGroup>

      {form.formState.errors.root && (
        <Alert variant="destructive">
          <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending || !isDirty}>
          {isPending ? "Saving…" : "Save"}
        </Button>
        {saved && (
          <span className="text-sm text-muted-foreground">Saved ✓</span>
        )}
      </div>
    </form>
  );
}
