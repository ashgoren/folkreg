// Assertions for config forms' autosave, which runs on real timers in component tests: the
// form's watch effect hands parsed values to useAutosave's 500ms debounce, which then calls the
// (mocked) server action.

import { expect, type Mock } from "vitest";
import { waitFor } from "@testing-library/react";

// Comfortably past the 500ms debounce, without slowing the suite much.
const SETTLE_MS = 800;

// Waits for the most recent save to carry `expected`. Asserting on the last call (rather than
// any call) matters for forms where several debounced edits coalesce into one save.
export const expectLastSave = (action: Mock, tenantId: string, expected: unknown) =>
  waitFor(() => expect(action).toHaveBeenLastCalledWith(tenantId, expected), { timeout: 2000 });

// Waits out the debounce and confirms no save went out -- used for invalid input, which the
// watch effect drops before it ever reaches useAutosave.
export const expectNoSave = async (action: Mock) => {
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  expect(action).not.toHaveBeenCalled();
};

// useAutosave deliberately doesn't cancel a pending debounced save on unmount (navigating away
// mid-edit still saves). In tests that means a test whose last edit is still debouncing when it
// ends can fire into the next test's freshly-reset mock -- so every test that edits a field
// should end by awaiting expectLastSave/expectNoSave rather than on a bare interaction.
