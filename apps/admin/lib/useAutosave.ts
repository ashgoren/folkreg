"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

/**
 * The save queue behind useAutosaveForm, which is what config pages use: this knows nothing about
 * forms, only how to send saves one at a time and report on them.
 *
 * At most one save is ever in flight, so a slow-to-resolve request can never land after (and
 * clobber) a fresher one. Saves requested while one is in flight collapse into a single follow-up
 * with the latest data, sent once it resolves. An error string from saveFn (or a thrown error) is
 * shown as a toast; a success shows "Saved ✓" for 2s via savedRecently.
 *
 * useAutosaveForm decides when to save. `save` keeps the same identity across renders (it's in that
 * hook's effect dependencies) and still calls the saveFn from the latest render: it's read from a
 * ref at call time.
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
    // The loop below will pick this up when the save in flight resolves.
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    savingRef.current = true;
    startTransition(async () => {
      // Each pass sends the latest data. Saves requested during a pass set pendingRef, and however
      // many there were, the loop goes round once more with whatever is latest by then.
      do {
        pendingRef.current = false;
        // saveFn returns an error string for expected failures, but can also throw (a network
        // failure, or a server action re-throwing an unexpected DB error). The catch turns that
        // into a toast instead of letting the transition rethrow into an error boundary, and keeps
        // the loop going, so the in-flight guard below is always released -- otherwise one thrown
        // save would leave savingRef stuck true and silently queue every later save forever.
        let error: string | null;
        try {
          error = await saveFnRef.current(latestRef.current as T);
        } catch (thrown) {
          console.error(thrown);
          error = "Couldn't save changes. Please try again.";
        }
        if (error) toast.error(error);
        else markSaved();
      } while (pendingRef.current);
      savingRef.current = false;
    });
  }, [markSaved]);

  return { save, isPending, savedRecently };
}
