import { describe, it, expect } from "vitest";
import { generalSchema } from "./schema";

const valid = { slug: "my-event-2026", is_live: false, show_preregistration: true };

describe("generalSchema", () => {
  it("accepts lowercase letters, digits, and hyphens", () => {
    expect(generalSchema.safeParse(valid).success).toBe(true);
  });

  // slug is the one General field that's presence-checked: it's the tenant's routing
  // identifier ({slug}.folkreg.org), and Postgres `not null` doesn't stop an empty string.
  it("requires a non-empty slug", () => {
    const result = generalSchema.safeParse({ ...valid, slug: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Required");
  });

  it.each([
    ["uppercase", "MyEvent"],
    ["spaces", "my event"],
    ["dots (would create a nested subdomain)", "my.event"],
    ["underscores", "my_event"],
    ["a full URL", "https://my-event.folkreg.org"],
  ])("rejects a slug containing %s", (_, slug) => {
    const result = generalSchema.safeParse({ ...valid, slug });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Lowercase letters, numbers, and hyphens only");
  });

  it("requires the booleans to actually be booleans", () => {
    expect(generalSchema.safeParse({ ...valid, is_live: "true" }).success).toBe(false);
    expect(generalSchema.safeParse({ ...valid, show_preregistration: undefined }).success).toBe(false);
  });
});
