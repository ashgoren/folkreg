// Assertions for config pages' autosave, which runs on real timers in component tests. A page
// calls its (mocked) server action when a typed field loses focus, or right away for a click.

import { expect, type Mock } from "vitest";
import { waitFor } from "@testing-library/react";

// Comfortably past any save already underway, without slowing the suite much.
const SETTLE_MS = 800;

// Waits for the most recent save to carry `expected`. Asserting on the last call (rather than
// any call) matters where several edits are saved in turn.
export const expectLastSave = (action: Mock, tenantId: string, expected: unknown) =>
  waitFor(() => expect(action).toHaveBeenLastCalledWith(tenantId, expected), { timeout: 2000 });

// Waits a while and confirms no save went out -- used for invalid input, which is never sent,
// and for typing that hasn't left its field yet.
export const expectNoSave = async (action: Mock) => {
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  expect(action).not.toHaveBeenCalled();
};

// A save already in flight keeps going when its page unmounts (navigating away mid-save still
// saves). In tests that means a test whose last save is still in flight when it ends can resolve
// into the next test's freshly-reset mock -- so every test that edits a field should end by
// awaiting expectLastSave/expectNoSave rather than on a bare interaction.
