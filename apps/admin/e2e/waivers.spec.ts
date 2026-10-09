import { test, expect, service, readTenantConfig, waitForSaved } from "./fixtures";
import { readSecrets } from "../test/supabase";

test.beforeEach(async ({ page, dashboardUrl }) => {
  await page.goto(dashboardUrl("waivers"));
});

test("reveals DocuSeal fields when on, saving the key to tenant_secrets", async ({ page, tenantId }) => {
  await expect(page.getByLabel("DocuSeal template ID")).toBeHidden();

  await page.getByRole("switch", { name: "Show waiver?" }).click();
  await page.getByLabel("DocuSeal template ID").fill("tmpl-123");
  await page.getByLabel("DocuSeal API key").fill("docuseal-secret");
  await waitForSaved(page);

  await expect.poll(async () => (await readTenantConfig(tenantId)).waiver_config)
    .toEqual({ show: true, docusealTemplateId: "tmpl-123" });
  await expect.poll(async () => (await readSecrets(service, tenantId)).docuseal_key).toBe("docuseal-secret");

  await page.reload();
  await expect(page.getByRole("switch", { name: "Show waiver?" })).toBeChecked();
  await expect(page.getByLabel("DocuSeal template ID")).toHaveValue("tmpl-123");
  // SecretInput masks the key as a password field; the reveal toggle switches it to text.
  const key = page.getByLabel("DocuSeal API key");
  await expect(key).toHaveAttribute("type", "password");
  await expect(key).toHaveValue("docuseal-secret");
  await page.getByRole("button", { name: "Show value" }).click();
  await expect(key).toHaveAttribute("type", "text");
});

test("turning the waiver off hides the fields but keeps their values", async ({ page, tenantId }) => {
  await page.getByRole("switch", { name: "Show waiver?" }).click();
  await page.getByLabel("DocuSeal template ID").fill("tmpl-123");
  await expect.poll(async () => (await readTenantConfig(tenantId)).waiver_config?.docusealTemplateId).toBe("tmpl-123");

  await page.getByRole("switch", { name: "Show waiver?" }).click();
  await expect(page.getByLabel("DocuSeal template ID")).toBeHidden();

  // react-hook-form keeps an unmounted field's value (shouldUnregister defaults to false), so
  // hiding the fields doesn't discard what was entered.
  await expect.poll(async () => (await readTenantConfig(tenantId)).waiver_config)
    .toEqual({ show: false, docusealTemplateId: "tmpl-123" });
});
