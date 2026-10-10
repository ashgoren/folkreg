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
    defaultValues: {
      is_live: tenant.is_live,
      show_preregistration: tenant.show_preregistration,
    },
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
            name="show_preregistration"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field orientation="horizontal" data-invalid={fieldState.invalid}>
                <FieldContent>
                  <FormLabel htmlFor="general-preregistration">Show preregistration?</FormLabel>
                  <FieldDescription>When on, shows policy acknowledgment checkbox before registration</FieldDescription>
                </FieldContent>
                <Switch
                  id="general-preregistration"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-invalid={fieldState.invalid}
                />
              </Field>
            )}
          />

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
                  <FieldDescription>Registration is currently <strong>{field.value ? "open" : "closed"}</strong> to the public</FieldDescription>
                </FieldContent>
                {/* Opening or closing registration is immediately public, so the switch asks first. */}
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
              <AlertDialogTitle>{pendingLive ? "Open registration to the public?" : "Close registration?"}</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingLive
                  ? `${slug}.folkreg.org will take real registrations and payments.`
                  : "The public will see a placeholder page instead of the registration form."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => form.setValue("is_live", pendingLive!)}>
                {pendingLive ? "Go live" : "Close registration"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AutosaveStatus isPending={isPending} savedRecently={savedRecently} />
      </form>
    </div>
  );
}
