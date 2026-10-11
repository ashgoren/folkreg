"use client";

import { useState } from "react";
import { Controller } from "react-hook-form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Field, FieldContent, FieldDescription, FieldGroup } from "@/components/ui/field";
import { AutosaveStatus } from "@/components/autosave-status";
import { FormLabel } from "@/components/form-label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAutosaveForm } from "@/lib/useAutosaveForm";
import type { Tenant } from "@repo/types";
import { generalSchema } from "./schema";
import { updateGeneral } from "./actions";
import { SlugSetting } from "./SlugSetting";

export function GeneralForm({ tenant }: { tenant: Tenant }) {
  const { form, formProps, isPending, savedRecently } = useAutosaveForm({
    label: "General",
    schema: generalSchema,
    defaultValues: { is_live: tenant.is_live },
    save: (data) => updateGeneral(tenant.id, data),
  });

  // The live-mode value the organizer asked to switch to, while its confirmation is open.
  const [pendingLive, setPendingLive] = useState<boolean | null>(null);
  // The saved subdomain, which SlugSetting saves on its own; the live-mode confirmation names it.
  const [slug, setSlug] = useState(tenant.slug);

  return (
    <div className="space-y-8">
      {/* Outside the autosaving form: the subdomain saves only when the organizer confirms. */}
      <SlugSetting tenantId={tenant.id} slug={slug} onSaved={setSlug} />

      <Separator />

      <form {...formProps} className="space-y-8">
        <FieldGroup>

          <Controller
            name="is_live"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <div className="flex items-center gap-2">
                    <FormLabel htmlFor="general-is-live">Live mode?</FormLabel>
                    <Badge variant={field.value ? "destructive" : "secondary"}>
                      {field.value ? "LIVE" : "SANDBOX"}
                    </Badge>
                  </div>
                  <FieldDescription>
                    {field.value
                      ? "The registration site is public, and payments use your live keys. Opening and closing registration is on the Registration page."
                      : "Only preview links reach the registration site, and payments use your test keys. The public sees a placeholder."}
                  </FieldDescription>
                </FieldContent>
                {/* Going live or back to sandbox is immediately public, so the switch asks first. */}
                <Switch
                  id="general-is-live"
                  checked={field.value}
                  onCheckedChange={setPendingLive}
                  aria-invalid={fieldState.invalid}
                />
              </Field>
            )}
          />

        </FieldGroup>

        <AlertDialog open={pendingLive !== null} onOpenChange={(open) => { if (!open) setPendingLive(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{pendingLive ? "Go live?" : "Switch to sandbox?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingLive
                  ? `${slug}.folkreg.org will be public, and payments will use your live keys and charge real cards.`
                  : "The public will see a placeholder instead of the registration site, and payment links already sent will stop working until you go live again."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => form.setValue("is_live", pendingLive!)}>
                {pendingLive ? "Go live" : "Switch to sandbox"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
      </form>
    </div>
  );
}
