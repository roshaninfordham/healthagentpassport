import { expect, test } from "@playwright/test";

test("trusted agent is allowed and sketchy agent is blocked", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /where healthagent passport sits/i })
  ).toBeVisible();
  await expect(page.getByText(/healthcare permission/i)).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /protect a health api in 5 minutes/i })
  ).toBeVisible();

  await page.getByRole("button", { name: /run trustedcareagent/i }).click();
  await expect(page.getByText(/access granted/i)).toBeVisible();
  await expect(page.getByText(/trusted-care-agent/i).first()).toBeVisible();
  await expect(page.getByText(/Gateway forwarded an approved request upstream/i)).toBeVisible();

  await page.getByRole("button", { name: /run sketchyscraperagent/i }).click();
  await expect(page.getByText(/access denied/i)).toBeVisible();
  await expect(page.getByText(/sketchy-scraper-agent/i).first()).toBeVisible();
  await expect(page.getByText(/Blocked before upstream/i).first()).toBeVisible();
  await expect(page.getByText(/Bulk dump hits are still zero/i)).toBeVisible();

  await expect(page.getByText(/Step-by-step request timeline/i)).toBeVisible();
});
