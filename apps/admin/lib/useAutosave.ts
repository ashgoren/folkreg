"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

/**
 * Serialized autosave for admin config pages: at most one save is ever in flight, so a
 * slow-to-resolve request can never land after (and clobber) a fresher one. A save requested while
 * one is in flight is queued, and re-fires with the latest data once it resolves.
 *
 * Callers decide when to save (text when its field loses focus, any other change right away; see
 * text-entry.ts). `save` keeps the same identity across renders (forms list it in effect
 * dependencies) and still calls the saveFn from the latest render: it's read from a ref at call
 * time.
 */
export function useAutosave<T>(saveFn: (data: T) => Promise<string | null>) {
  const [isPending, startTransition] = useTransition();
  const [savedRecently, setSavedRecently] = useState(false);

  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const latestRef = useRef<T | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Updated after each render rather than during it: React asks that refs not be written while
  // rendering.
  const saveFnRef = useRef(saveFn);
  useEffect(() => {
    saveFnRef.current = saveFn;
  });

  // Restarts the "Saved ✓" countdown, so the indicator stays up until 2s after the most recent
  // save rather than being cut short by an earlier save's timer.
  const markSaved = useCallback(() => {
    setSavedRecently(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedRecently(false), 2000);
  }, []);

  const save = useCallback((data: T) => {
    latestRef.current = data;
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    savingRef.current = true;
    startTransition(async () => {
      // saveFn returns an error string for expected failures, but can also throw (a network
      // failure, or a server action re-throwing an unexpected DB error). The catch turns that
      // into a toast instead of letting the transition rethrow into an error boundary, and the
      // finally releases the in-flight guard either way -- otherwise one thrown save would leave
      // savingRef stuck true and silently queue every later save forever.
      let error: string | null;
      try {
        error = await saveFnRef.current(latestRef.current as T);
      } catch (thrown) {
        console.error(thrown);
        error = "Couldn't save changes. Please try again.";
      } finally {
        savingRef.current = false;
      }
      if (error) {
        toast.error(error);
      } else {
        markSaved();
      }
      if (pendingRef.current) {
        pendingRef.current = false;
        save(latestRef.current as T);
      }
    });
  }, [markSaved]);

  return { save, isPending, savedRecently };
}
