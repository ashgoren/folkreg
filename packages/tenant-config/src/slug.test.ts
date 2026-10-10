import { describe, it, expect } from "vitest";
import { RESERVED_SLUGS, SLUG_PATTERN, slugSchema } from "./slug";

const message = (slug: string) => slugSchema.safeParse(slug).error?.issues[0]?.message;

describe("slugSchema", () => {
  it.each(["dance", "spring-dance-2026", "a", "dev", "x".repeat(63)])("accepts %j", (slug) => {
    expect(slugSchema.safeParse(slug).success).toBe(true);
  });

  it.each([
    ["", "Required"],
    ["Spring Dance", "Lowercase letters, numbers, and hyphens only"],
    ["dance.org", "Lowercase letters, numbers, and hyphens only"],
    ["-dance", "Can't start or end with a hyphen"],
    ["dance-", "Can't start or end with a hyphen"],
    ["x".repeat(64), "63 characters at most"],
    ["admin", "That name is reserved"],
    ["www", "That name is reserved"],
  ])("rejects %j: %s", (slug, error) => {
    expect(message(slug)).toBe(error);
  });

  // The zod rules and the one-line pattern (which the database constraint uses) agree.
  it.each(["dance", "a", "x".repeat(63), "-dance", "dance-", "x".repeat(64), "Dance", ""])("matches SLUG_PATTERN for %j", (slug) => {
    const isReserved = (RESERVED_SLUGS as readonly string[]).includes(slug);
    expect(slugSchema.safeParse(slug).success).toBe(SLUG_PATTERN.test(slug) && !isReserved);
  });
});
