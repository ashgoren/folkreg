import { describe, it, expect } from "vitest";
import { isLocalUrl } from "./local-url";

describe("isLocalUrl", () => {
  it.each(["http://127.0.0.1:54321", "http://localhost:54321", "http://127.0.0.1", "https://localhost/rest/v1"])(
    "accepts %s",
    (url) => expect(isLocalUrl(url)).toBe(true),
  );

  // Each starts with a local host name but reaches a different machine.
  it.each([
    "http://localhost.example.com",
    "http://127.0.0.1.nip.io:54321",
    "http://localhost@db.example.com",
    "https://abcdefgh.supabase.co",
    "ftp://localhost",
    "",
    "localhost:54321",
  ])("rejects %j", (url) => expect(isLocalUrl(url)).toBe(false));
});
