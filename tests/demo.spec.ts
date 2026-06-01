import { expect, test } from "@playwright/test";

test("runs complete and incomplete electronic prior-auth demo cases", async ({
  page
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "PriorAuth Passport", exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("AI-powered electronic prior authorization agent.", {
      exact: true
    })
  ).toBeVisible();
  await expect(
    page.getByText("Manual Bottlenecks", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Automated Agent", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText("Quantifiable Savings", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("$5.18", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Patient Service Request: CPT 93306", { exact: true })
  ).toBeVisible();
  await expect(
    page.getByText(/PriorAuth Passport is an autonomous ePA platform/i)
  ).toBeVisible();
  await page.getByRole("button", { name: /prior auth inbox/i }).click();
  await expect(
    page.getByRole("heading", { name: /prior authorization inbox/i })
  ).toBeVisible();

  await page.getByRole("button", { name: /run epa/i }).click();
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

  await page.getByRole("button", { name: /prior auth inbox/i }).click();
  await page.getByRole("button", { name: /check evidence/i }).click();
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
