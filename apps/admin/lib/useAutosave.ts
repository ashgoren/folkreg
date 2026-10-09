"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

/**
 * Debounced/serialized autosave for admin config pages. saveNow/saveDebounced
 * both funnel through the same in-flight guard, so a slow-to-resolve request
 * can never land after (and clobber) a fresher one -- at most one save is
 * ever in flight; a save triggered while one's pending just gets queued to
 * re-fire with the latest data once it resolves.
 *
 * saveNow/saveDebounced keep the same identity across renders (forms list them in effect
 * dependencies) and still call the saveFn from the latest render: it's read from a ref at call
 * time, so even a debounce started before a re-render uses the current one.
 */
export function useAutosave<T>(saveFn: (data: T) => Promise<string | null>, delay = 500) {
  const [isPending, startTransition] = useTransition();
  const [savedRecently, setSavedRecently] = useState(false);

  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const latestRef = useRef<T | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const fire = useCallback((data: T) => {
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
        fire(latestRef.current as T);
      }
    });
  }, [markSaved]);

  const saveNow = useCallback((data: T) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    fire(data);
  }, [fire]);

  const saveDebounced = useCallback((data: T) => {
    latestRef.current = data;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fire(latestRef.current as T), delay);
  }, [fire, delay]);

  return { saveNow, saveDebounced, isPending, savedRecently };
}
