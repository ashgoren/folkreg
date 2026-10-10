"use client";

import { useState, useTransition, type FormEvent } from "react";
import { slugSchema } from "@repo/tenant-config";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { FormLabel } from "@/components/form-label";
import { Input } from "@/components/ui/input";
import { updateSlug } from "./actions";

// The first rule a subdomain breaks, if any: the same rules the server and database apply.
const slugProblem = (slug: string) => slugSchema.safeParse(slug).error?.issues[0]?.message ?? null;

/**
 * The tenant's subdomain, which is its registration site's address. Unlike the rest of the admin it
 * doesn't autosave: changing it moves the site and the old address stops working, so it's an
 * explicit Change, Save, and confirmation. Its own <form>, so Enter saves the subdomain alone.
 */
export function SlugSetting({ tenantId, slug, onSaved }: {
  tenantId: string;
  /** The saved subdomain. */
  slug: string;
  onSaved: (slug: string) => void;
}) {
  // The subdomain being typed; null while not editing.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isSaving, startSaving] = useTransition();

  function stopEditing() {
    setDraft(null);
    setError(null);
  }

  // Checked before asking, so the confirmation only ever offers a subdomain that can be saved.
  function requestSave(event: FormEvent) {
    event.preventDefault();
    if (draft === null || draft === slug) return stopEditing();
    const problem = slugProblem(draft);
    if (problem) return setError(problem);
    setConfirming(true);
  }

  function move(next: string) {
    startSaving(async () => {
      // E.g. taken by another tenant since the check above; shown under the field to fix.
      const result = await updateSlug(tenantId, next);
      if (result) return setError(result);
      onSaved(next);
      stopEditing();
    });
  }

  if (draft === null) {
    return (
      <Field>
        <FormLabel>Subdomain</FormLabel>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{slug}.folkreg.org</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setDraft(slug)}>Change</Button>
        </div>
      </Field>
    );
  }

  return (
    <form onSubmit={requestSave} autoComplete="off">
      <Field data-invalid={error !== null}>
        <FormLabel htmlFor="general-slug">Subdomain</FormLabel>
        <div className="flex items-center gap-2">
          <Input
            id="general-slug"
            className="w-56"
            value={draft}
            autoFocus
            aria-invalid={error !== null}
            // Once an error shows, it updates as the organizer types, so it clears when fixed.
            onChange={(e) => { setDraft(e.target.value); if (error) setError(slugProblem(e.target.value)); }}
            onBlur={() => setError(draft === slug ? null : slugProblem(draft))}
          />
          <span className="text-sm text-muted-foreground">.folkreg.org</span>
        </div>
        {error && <FieldError>{error}</FieldError>}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={isSaving}>Save</Button>
          <Button type="button" variant="ghost" size="sm" onClick={stopEditing}>Cancel</Button>
        </div>
      </Field>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move the registration site?</AlertDialogTitle>
            <AlertDialogDescription>
              From <strong>{slug}.folkreg.org</strong> to <strong>{draft}.folkreg.org</strong>. The old address stops working
              right away — update any links to it (event website, emails, printed materials).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => move(draft)}>Move it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
