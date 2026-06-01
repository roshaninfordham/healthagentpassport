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
  await expect(page.getByText("Synthetic data only").first()).toBeVisible();
  await expect(page.getByText("Real EHR + payer APIs").first()).toBeVisible();
  await expect(page.getByText("$5.18", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Metrics first. Workflow visible." })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Prior Authorization Audit Packet" })
  ).toBeVisible();

  await page.getByRole("button", { name: "Start live demo" }).first().click();
  await expect(
    page.getByText("Generated Audit Packet: Submitted").first()
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("GET /api/demo/ehr/patient/maya-001").first()).toBeVisible();
  await expect(page.getByText("POST /api/demo/payer/submit").first()).toBeVisible();
  await expect(page.getByText(/PA-DEMO-/).first()).toBeVisible();
  await expect(
    page.getByText("pending_payer_review", { exact: true }).first()
  ).toBeVisible();
  await expect(page.getByText("2/2").first()).toBeVisible();

  await page.getByRole("button", { name: /audit ledger/i }).click();
  await expect(page.getByText("Requirement lookups", { exact: true })).toBeVisible();
  await expect(page.getByText("Submissions", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /copy audit json/i })).toBeVisible();

  await page.getByRole("button", { name: "Check gaps" }).first().click();
  await expect(
    page.getByText("Generated Audit Packet: Needs human review").first()
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Missing evidence stopped payer submission.")).toBeVisible();
  await expect(page.getByText("needs_human_review").first()).toBeVisible();
  await expect(page.getByText("referral_note").first()).toBeVisible();
  await expect(page.getByText("recent_vitals_or_observation").first()).toBeVisible();

  await page.getByRole("button", { name: /developer mode/i }).click();
  await expect(page.getByText(/pnpm priorauth submit/i)).toBeVisible();
});
