"use client";

import { FieldGroup } from "@/components/ui/field";
import { AutosaveStatus } from "@/components/autosave-status";
import { TextField } from "@/components/form-text-field";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import type { Tenant } from "@repo/types";
import { receiptsConfigSchema } from "@repo/tenant-config";
import { updateReceipts } from "./actions";

export function ReceiptsForm({ tenant }: { tenant: Tenant }) {
  const { form, formProps, isPending, savedRecently } = useAutosaveForm({
    schema: receiptsConfigSchema,
    defaultValues: tenant.receipts_config,
    save: (data) => updateReceipts(tenant.id, data),
  });

  return (
    <form {...formProps} className="space-y-8">

      <FieldGroup>
        <TextField control={form.control} name="emailFrom" id="receipts-email-from" label="From address" type="email" autoComplete="off" />

        <TextField control={form.control} name="emailReplyTo" id="receipts-email-reply-to" label="Reply-to address (if different)" type="email" autoComplete="off" />
      </FieldGroup>

      <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
    </form>
  );
}
