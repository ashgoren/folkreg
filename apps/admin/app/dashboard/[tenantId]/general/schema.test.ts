import { describe, it, expect } from "vitest";
import { generalSchema, slugValuesSchema } from "./schema";

describe("generalSchema", () => {
  it("accepts the two switches", () => {
    expect(generalSchema.safeParse({ is_live: false, show_preregistration: true }).success).toBe(true);
  });

  it("requires the booleans to actually be booleans", () => {
    expect(generalSchema.safeParse({ is_live: "true", show_preregistration: true }).success).toBe(false);
    expect(generalSchema.safeParse({ is_live: false, show_preregistration: undefined }).success).toBe(false);
  });
});

// The subdomain's full rules are tested with slugSchema in @repo/tenant-config; these are the
// mistakes an organizer is likeliest to make typing one.
describe("slugValuesSchema", () => {
  it("accepts lowercase letters, digits, and hyphens", () => {
    expect(slugValuesSchema.safeParse({ slug: "my-event-2026" }).success).toBe(true);
  });

  // The tenant's routing identifier ({slug}.folkreg.org); Postgres `not null` doesn't stop "".
  it("requires a subdomain", () => {
    expect(slugValuesSchema.safeParse({ slug: "" }).error?.issues[0]?.message).toBe("Required");
  });

  it.each([
    ["uppercase", "MyEvent"],
    ["spaces", "my event"],
    ["dots (would create a nested subdomain)", "my.event"],
    ["underscores", "my_event"],
    ["a full URL", "https://my-event.folkreg.org"],
  ])("rejects a subdomain containing %s", (_, slug) => {
    expect(slugValuesSchema.safeParse({ slug }).error?.issues[0]?.message).toBe("Lowercase letters, numbers, and hyphens only");
  });
});
