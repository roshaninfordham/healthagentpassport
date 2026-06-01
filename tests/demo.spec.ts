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
  await expect(page.getByText(/Discover payer requirements/i)).toBeVisible();
  await page.getByRole("button", { name: /prior auth inbox/i }).click();
  await expect(
    page.getByRole("heading", { name: /prior authorization inbox/i })
  ).toBeVisible();

  await page.getByRole("button", { name: /run complete epa case/i }).click();
  await expect(page.getByText(/Electronic prior authorization workflow complete/i)).toBeVisible({
    timeout: 30_000
  });
  await expect(page.getByText(/fetchEhrResource/i).first()).toBeVisible();
  await expect(page.getByText(/Calling POST http:\/\/localhost:4102\/prior-auth\/submit/i)).toBeVisible();
  await expect(page.getByText("PA-DEMO-1001", { exact: true })).toBeVisible();
  await expect(
    page.getByText("pending_payer_review", { exact: true })
  ).toBeVisible();

  await page.getByRole("button", { name: /audit ledger/i }).click();
  await expect(page.getByText(/Requirement lookups/i)).toBeVisible();
  await expect(page.getByText(/Submissions/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /copy audit json/i })).toBeVisible();

  await page.getByRole("button", { name: /run incomplete documentation case/i }).click();
  await expect(
    page.getByText(/Missing evidence detected\. Draft saved/i)
  ).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /evidence & requirements/i }).click();
  await expect(page.getByText(/No payer submission/i)).toBeVisible();
  await expect(page.getByText(/Recent relevant observation/i)).toBeVisible();
  await expect(page.getByText(/Referral note/i)).toBeVisible();

  await page.getByRole("button", { name: /developer mode/i }).click();
  await expect(page.getByText(/pnpm priorauth submit/i)).toBeVisible();
});
