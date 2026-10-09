import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { TenantNotFoundError } from "@repo/db/errors";
import { actAsLoggedOut, useActionHarness } from "@/test/action-harness";

// See app/dashboard/[tenantId]/general/actions.test.ts for why only the server client factory is
// mocked.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
import { createClient } from "@/lib/supabase/server";
import { saveTenantConfig } from "./save-tenant-config";

// A stand-in for a page's schema, with a transform so the tests can tell parsed data from raw.
const schema = z.object({ name: z.string().min(1).transform((name) => name.trim()) });

describe("saveTenantConfig", () => {
  const harness = useActionHarness(createClient);

  it("passes the parsed data and a db scoped to the tenant to write, and returns null", async () => {
    const write = vi.fn(async (db, data) => {
      expect(data).toEqual({ name: "trimmed" });
      expect((await db.getTenant())?.id).toBe(harness.tenantId);
    });
    expect(await saveTenantConfig(harness.tenantId, schema, { name: "  trimmed  " }, write)).toBeNull();
    expect(write).toHaveBeenCalledOnce();
  });

  it("returns \"Invalid data\" for values that fail the schema, without calling write", async () => {
    const write = vi.fn();
    expect(await saveTenantConfig(harness.tenantId, schema, { name: "" }, write)).toBe("Invalid data");
    expect(write).not.toHaveBeenCalled();
  });

  it("returns \"Not authenticated\" without a session, without calling write", async () => {
    const write = vi.fn();
    actAsLoggedOut(createClient);
    expect(await saveTenantConfig(harness.tenantId, schema, { name: "x" }, write)).toBe("Not authenticated");
    expect(write).not.toHaveBeenCalled();
  });

  it("returns the message a write returns for its own expected failure", async () => {
    expect(await saveTenantConfig(harness.tenantId, schema, { name: "x" }, async () => "That slug is already taken"))
      .toBe("That slug is already taken");
  });

  it("turns TenantNotFoundError into \"No tenant found\"", async () => {
    const write = async () => { throw new TenantNotFoundError(harness.tenantId); };
    expect(await saveTenantConfig(harness.tenantId, schema, { name: "x" }, write)).toBe("No tenant found");
  });

  // Anything else is a bug or an outage, not a message for the organizer: it reaches the caller,
  // and useAutosave reports it with its generic "Couldn't save" toast.
  it("re-throws any other error", async () => {
    const write = async () => { throw new Error("connection reset"); };
    await expect(saveTenantConfig(harness.tenantId, schema, { name: "x" }, write)).rejects.toThrow("connection reset");
  });
});
