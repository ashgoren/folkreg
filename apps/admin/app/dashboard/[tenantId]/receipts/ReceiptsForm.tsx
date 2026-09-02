"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FieldGroup } from "@/components/ui/field";
import { AutosaveStatus } from "@/components/autosave-status";
import { TextField } from "@/components/form-text-field";
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
        <TextField control={form.control} name="emailFrom" id="receipts-email-from" label="From address" type="email" autoComplete="off" />

        <TextField control={form.control} name="emailReplyTo" id="receipts-email-reply-to" label="Reply-to address (if different)" type="email" autoComplete="off" />
      </FieldGroup>

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
