"use client";

import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

/**
 * Debounced/serialized autosave for admin config pages. saveNow/saveDebounced
 * both funnel through the same in-flight guard, so a slow-to-resolve request
 * can never land after (and clobber) a fresher one -- at most one save is
 * ever in flight; a save triggered while one's pending just gets queued to
 * re-fire with the latest data once it resolves.
 */
export function useAutosave<T>(saveFn: (data: T) => Promise<string | null>, delay = 500) {
  const [isPending, startTransition] = useTransition();
  const [savedRecently, setSavedRecently] = useState(false);

  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const latestRef = useRef<T | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restarts the "Saved ✓" countdown, so the indicator stays up until 2s after the most recent
  // save rather than being cut short by an earlier save's timer.
  function markSaved() {
    setSavedRecently(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedRecently(false), 2000);
  }

  function fire(data: T) {
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
        error = await saveFn(latestRef.current as T);
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
        fire(latestRef.current as T);
      }
    });
  }

  function saveNow(data: T) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    fire(data);
  }

  function saveDebounced(data: T) {
    latestRef.current = data;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fire(latestRef.current as T), delay);
  }

  return { saveNow, saveDebounced, isPending, savedRecently };
}
