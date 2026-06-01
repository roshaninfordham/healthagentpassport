import { expect, test } from "@playwright/test";

test("runs complete and incomplete electronic prior-auth demo cases", async ({
  page
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /priorauth passport/i })
  ).toBeVisible();
  await expect(
    page.getByText(/Real-time electronic prior authorization infrastructure/i)
  ).toBeVisible();
  await expect(
    page.getByText("$5.18 transaction delta", { exact: true })
  ).toBeVisible();

  await page.getByRole("button", { name: /run complete epa case/i }).click();
  await expect(page.getByText(/Electronic prior authorization workflow complete/i)).toBeVisible({
    timeout: 20_000
  });
  await expect(page.getByText(/PA-DEMO-1001/i)).toBeVisible();
  await expect(page.getByText(/pending_payer_review/i)).toBeVisible();
  await expect(page.getByText(/Requirement lookups/i)).toBeVisible();
  await expect(page.getByText(/Submissions/i)).toBeVisible();

  await page.getByRole("button", { name: /run incomplete documentation case/i }).click();
  await expect(
    page.getByText(/Missing evidence detected\. Draft saved/i)
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/No payer submission/i)).toBeVisible();
  await expect(page.getByText(/Recent relevant observation/i)).toBeVisible();
  await expect(page.getByText(/Referral note/i)).toBeVisible();
});
