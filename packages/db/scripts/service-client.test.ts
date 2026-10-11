import { afterEach, describe, it, expect } from "vitest";
import { isLocalUrl } from "../src/local-url";
import { loadServiceClient } from "./service-client";

describe("loadServiceClient", () => {
  const shellUrl = process.env.SUPABASE_URL;
  // process.env stores an assigned undefined as the string "undefined", so an unset value is deleted.
  afterEach(() => {
    if (shellUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = shellUrl;
  });

  // E.g. a production URL exported in the shell while a script is pointed at the local env file:
  // the named file decides which database is written to.
  it("uses the env file's database over one already set in the shell", () => {
    process.env.SUPABASE_URL = "https://elsewhere.supabase.co";
    const { url } = loadServiceClient(".env.test.local");
    expect(isLocalUrl(url)).toBe(true);
  });
});
