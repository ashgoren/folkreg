import { describe, expect, it } from "vitest";
import { slugFromHost } from "./slug-from-host";

describe("slugFromHost", () => {
  it.each([
    ["dev.folkreg.org", "dev"],
    ["dev.localhost:3000", "dev"],
    ["spring-dance.folkreg.org", "spring-dance"],
    // Hostnames are case-insensitive; slugs are stored lowercase.
    ["DEV.folkreg.org", "dev"],
  ])("reads %j as %j", (host, slug) => {
    expect(slugFromHost(host)).toBe(slug);
  });

  it.each([
    // No subdomain.
    ["localhost:3000"],
    ["localhost"],
    // Reserved names, which no tenant can have.
    ["www.folkreg.org"],
    ["admin.localhost:3000"],
    // The platform's own domain, whose first label is reserved for this reason.
    ["folkreg.org"],
    // First labels that aren't valid slugs.
    ["-dance.folkreg.org"],
    ["my_event.folkreg.org"],
    [""],
  ])("finds no slug in %j", (host) => {
    expect(slugFromHost(host)).toBeNull();
  });
});
