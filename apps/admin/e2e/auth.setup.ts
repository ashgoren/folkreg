import { test as setup, expect } from "@playwright/test";
import { E2E_OWNER_EMAIL, TEST_PASSWORD } from "../test/supabase";

// Logs in once through the real login form and saves the resulting Supabase auth cookies, so
// every spec in the "chromium" project starts already signed in as the e2e tenant's owner.
setup("sign in as the e2e tenant owner", async ({ page }) => {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(E2E_OWNER_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard\/[0-9a-f-]{36}\/general$/);
  await page.context().storageState({ path: "e2e/.auth/state.json" });
});
