"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Field, FieldError, FieldGroup } from "@/components/ui/field";
import { AutosaveStatus } from "@/components/autosave-status";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import { useAutosave } from "@/lib/useAutosave";
import type { Tenant } from "@repo/types";
import { receiptsSchema, type ReceiptsValues } from "./schema";
import { updateReceipts } from "./actions";

export function ReceiptsForm({ tenant }: { tenant: Tenant }) {
  const form = useForm<ReceiptsValues>({
    mode: "onBlur",
    resolver: zodResolver(receiptsSchema),
    defaultValues: {
      emailFrom: tenant.receipts_config?.emailFrom ?? "",
      emailReplyTo: tenant.receipts_config?.emailReplyTo ?? "",
    },
  });

  const { saveDebounced, isPending, savedRecently } = useAutosave<ReceiptsValues>(
    (data) => updateReceipts(tenant.id, data),
  );

  useEffect(() => {
    const subscription = form.watch((values) => {
      const parsed = receiptsSchema.safeParse(values);
      if (!parsed.success) return;
      saveDebounced(parsed.data);
    });
    return () => subscription.unsubscribe();
  }, [form, saveDebounced]);

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-8">

      <FieldGroup>
        <Controller name="emailFrom" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="receipts-email-from">From address</FormLabel>
            <Input {...field} id="receipts-email-from" type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />

        <Controller name="emailReplyTo" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FormLabel htmlFor="receipts-email-reply-to">Reply-to address (if different)</FormLabel>
            <Input {...field} id="receipts-email-reply-to" type="email" autoComplete="off" aria-invalid={fieldState.invalid} />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )} />
      </FieldGroup>

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
