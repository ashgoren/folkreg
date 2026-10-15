import type { RegistrationParty } from "@/app/registration-party";

// The registration form's work in progress, kept in sessionStorage, which is per-tab and per-origin.

const DRAFT_KEY = "registration-draft";

export const readDraftParty = (): RegistrationParty | null => {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    return raw === null ? null : (JSON.parse(raw) as { party?: RegistrationParty }).party ?? null;
  } catch {
    return null;
  }
};

export const writeDraftParty = (party: RegistrationParty) => {
  try {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ party }));
  } catch {
    // Unavailable or full: the form keeps working, it just won't survive a reload.
  }
};
