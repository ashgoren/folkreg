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

  function fire(data: T) {
    latestRef.current = data;
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    savingRef.current = true;
    startTransition(async () => {
      const error = await saveFn(latestRef.current as T);
      savingRef.current = false;
      if (error) {
        toast.error(error);
      } else {
        setSavedRecently(true);
        setTimeout(() => setSavedRecently(false), 2000);
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
