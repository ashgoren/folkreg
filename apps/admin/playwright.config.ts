import { defineConfig, devices } from "@playwright/test";

const STORAGE_STATE = "e2e/.auth/state.json";

export default defineConfig({
  testDir: "./e2e",
  // Every spec reads and writes the same seeded tenant (e2e-tenant), and some pages read config
  // another page writes (Spreadsheet derives its columns from fields_config). Running one test
  // at a time is what makes the per-test tenant reset in e2e/fixtures.ts sufficient isolation.
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  // The admin dev server compiles each route on first visit (webpack, see package.json), so the
  // first hit on a page can take several seconds.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3001",
    trace: "retain-on-failure",
  },
  projects: [
    // Runs first: auth.spec.ts logs out, and Supabase's signOut() revokes every session for the
    // user (global scope) -- running it after the setup project would invalidate the saved
    // storage state that every other spec depends on.
    {
      name: "auth",
      testMatch: "auth.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "setup",
      testMatch: "auth.setup.ts",
      dependencies: ["auth"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      testIgnore: ["auth.spec.ts", "auth.setup.ts"],
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3001/auth/login",
    // A dev server may already be running on :3001 (the usual case while developing). Reusing
    // it avoids a port collision, and Playwright only ever shuts down a server it started itself,
    // so an already-running one is left alone when the run finishes.
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
