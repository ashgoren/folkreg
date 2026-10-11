import { test, expect } from "./fixtures";

test("a tenant's subdomain serves its registration site", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
});

test("a subdomain with no tenant 404s", async ({ page }) => {
  const response = await page.goto("http://no-such-tenant.localhost:3000/");
  expect(response?.status()).toBe(404);
});
