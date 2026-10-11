import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Every spec reads and writes the same seeded tenant (registration-test-tenant). Running one
  // test at a time is what makes the per-test tenant reset in e2e/fixtures.ts sufficient isolation.
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  // The dev server compiles each route on first visit (webpack, see package.json), so the first
  // hit on a page can take several seconds.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    // The proxy resolves the tenant from the subdomain. Chromium resolves every *.localhost name
    // to the loopback address, so tenant subdomains work locally with no /etc/hosts entries.
    baseURL: "http://registration-test-tenant.localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    // Readiness is checked by port, not by `url`: a url check needs a 2xx/3xx (or 400-403)
    // response, but the proxy answers a bare localhost:3000 with 404 (no tenant subdomain), and
    // Node, which runs the check, doesn't resolve *.localhost subdomains the way Chromium does.
    port: 3000,
    // A dev server may already be running on :3000 (the usual case while developing). Reusing
    // it avoids a port collision, and Playwright only ever shuts down a server it started itself,
    // so an already-running one is left alone when the run finishes.
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
