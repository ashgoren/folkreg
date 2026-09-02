"use client";

import { useRef, useState } from "react";

/**
 * Gates a destructive value change behind a confirmation step. Callers supply their
 * own hasDataToLose check and onConfirm effect, so the same mechanism can guard any
 * "switching this discards that" selector (e.g. Payments' processor picker, Admissions'
 * pricing mode picker) despite each having a different data shape.
 */
export function useConfirmSwitch<T>() {
  const [pending, setPending] = useState<T | null>(null);
  const confirmActionRef = useRef<(() => void) | null>(null);

  function requestChange(newValue: T, hasDataToLose: boolean, onConfirm: (value: T) => void) {
    if (!hasDataToLose) {
      onConfirm(newValue);
      return;
    }
    confirmActionRef.current = () => onConfirm(newValue);
    setPending(newValue);
  }

  function confirm() {
    confirmActionRef.current?.();
    confirmActionRef.current = null;
    setPending(null);
  }

  function cancel() {
    confirmActionRef.current = null;
    setPending(null);
  }

  return { pending, requestChange, confirm, cancel };
}
