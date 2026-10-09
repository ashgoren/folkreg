import { test, expect, type Page } from "@playwright/test";
import {
  E2E_OWNER_EMAIL, E2E_TENANT_SLUG, TEST_PASSWORD, createServiceClient, getTenantIdBySlug,
} from "../test/supabase";

// Runs without saved storage state (see the "auth" project in playwright.config.ts), so every
// test here starts logged out.

const signIn = async (page: Page, password: string, email = E2E_OWNER_EMAIL) => {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
};

test("redirects an unauthenticated visitor to the login page", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/login$/);
  await expect(page.getByText("Sign in", { exact: true }).first()).toBeVisible();
});

test("shows an error for a wrong password and stays on the login page", async ({ page }) => {
  await signIn(page, "not-the-password");
  // Filtered by text because Next's route announcer is also a role="alert" element on every page.
  await expect(page.getByRole("alert").filter({ hasText: /invalid login credentials/i })).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/login$/);
  // LoginForm refocuses the email input after a failed attempt so the user can retry.
  await expect(page.getByLabel("Email")).toBeFocused();
});

test("logs in to the owner's tenant dashboard, then logs out", async ({ page }) => {
  const tenantId = await getTenantIdBySlug(createServiceClient(), E2E_TENANT_SLUG);

  await signIn(page, TEST_PASSWORD);
  await expect(page).toHaveURL(`/dashboard/${tenantId}/general`);
  await expect(page.getByRole("heading", { level: 1, name: "General" })).toBeVisible();

  // The sidebar footer shows the signed-in email as a dropdown trigger holding "Log out".
  await page.getByRole("button", { name: E2E_OWNER_EMAIL }).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);

  // The session is really gone, not just navigated away from.
  await page.goto(`/dashboard/${tenantId}/general`);
  await expect(page).toHaveURL(/\/auth\/login$/);
});

test.describe("a user who owns no tenant", () => {
  const service = createServiceClient();
  const email = "e2e-no-tenant@test.local";
  let userId: string | undefined;

  // Not part of the shared seed (nothing else needs a tenant-less user), so created for this
  // block and deleted afterwards.
  test.beforeAll(async () => {
    const { data, error } = await service.auth.admin.createUser({ email, password: TEST_PASSWORD, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
  });
  test.afterAll(async () => {
    if (userId) await service.auth.admin.deleteUser(userId);
  });

  test("sees that no event is set up, and can log out", async ({ page }) => {
    await signIn(page, TEST_PASSWORD, email);
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("No event set up")).toBeVisible();

    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);

    // Logged out for real: /dashboard now redirects to login instead of showing the page again.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/login$/);
  });
});
