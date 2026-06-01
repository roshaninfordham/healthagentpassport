import { expect, test } from "@playwright/test";

test("trusted agent is allowed and sketchy agent is blocked", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /where healthagent passport sits/i })
  ).toBeVisible();
  await expect(page.getByText(/healthcare permission/i)).toBeVisible();

  await page.getByRole("button", { name: /run trustedcareagent/i }).click();
  await expect(page.getByText(/access granted/i)).toBeVisible();
  await expect(page.getByText(/TrustedCareAgent/i).first()).toBeVisible();
  await expect(page.getByText("CLEAN risk 4/100")).toBeVisible();

  await page.getByRole("button", { name: /run sketchyscraperagent/i }).click();
  await expect(page.getByText(/access denied/i)).toBeVisible();
  await expect(page.getByText(/SketchyScraperAgent/i).first()).toBeVisible();
  await expect(page.getByText("BLOCK risk 100/100")).toBeVisible();

  await expect(page.getByText(/Gateway Decisions/i)).toBeVisible();
});
